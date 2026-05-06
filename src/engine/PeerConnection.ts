/**
 * Secure-Drop — WebRTC Peer Connection Manager
 * ==============================================
 * Encapsulates one RTCPeerConnection and its associated DataChannel.
 *
 * Responsibilities:
 *   - Create/accept WebRTC connections via SDP offer/answer
 *   - Relay ICE candidates through the SignalingClient
 *   - Manage DataChannel send/receive lifecycle
 *   - Expose a clean promise-based API for the transfer layer
 *
 * Data Channel Configuration:
 *   - ordered: true  — chunks arrive in sequence; no reordering required
 *   - maxRetransmits: null (unlimited) — reliable delivery (like TCP)
 *   - bufferedAmountLowThreshold — used for backpressure control
 */

import { ICE_SERVERS, DC_BUFFER_THRESHOLD } from "@/lib/constants";
import type { SignalingClient } from "./SignalingClient";

export type DataHandler = (data: ArrayBuffer) => void;
export type StateHandler = (state: RTCDataChannelState | RTCPeerConnectionState) => void;

export class PeerConnection {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private dataHandlers: Set<DataHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();
  private drainResolvers: Array<() => void> = [];

  constructor(
    private readonly remotePeerId: string,
    private readonly signaling: SignalingClient,
    private readonly isInitiator: boolean,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this._attachPcHandlers();
  }

  // ── Connection Lifecycle ─────────────────────────────────────────────────

  /** Called by the initiator to create an SDP offer and send over signaling. */
  async initiateOffer(): Promise<void> {
    // Initiator creates the DataChannel.
    this.dc = this.pc.createDataChannel("secure-drop", {
      ordered: true,
    });
    this._attachDcHandlers(this.dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signaling.sendOffer(this.remotePeerId, offer);
  }

  /** Called by the non-initiator upon receiving an SDP offer. */
  async receiveOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.sendAnswer(this.remotePeerId, answer);
  }

  /** Called by the initiator upon receiving an SDP answer. */
  async receiveAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  /** Add a remote ICE candidate. */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("[PeerConnection] Failed to add ICE candidate", e);
    }
  }

  /** Close the DataChannel and RTCPeerConnection. */
  close(): void {
    this.dc?.close();
    this.pc.close();
  }

  // ── Data Transfer ────────────────────────────────────────────────────────

  /**
   * Wait for the DataChannel to reach the "open" state.
   * Resolves immediately if already open. Rejects after 15 s.
   */
  waitForOpen(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.dc?.readyState === "open") return resolve();

      const timeout = setTimeout(() => {
        reject(new Error("[PeerConnection] DataChannel did not open within 15 s"));
      }, 15_000);

      const unsub = this.onStateChange((s) => {
        if (s === "open") {
          clearTimeout(timeout);
          unsub();
          resolve();
        }
      });
    });
  }

  /**
   * Send a binary frame over the DataChannel.
   *
   * Waits for the channel to open if it isn't yet,
   * then implements backpressure via bufferedAmountLowThreshold.
   */
  async sendBinary(data: ArrayBuffer): Promise<void> {
    // Wait for channel to be ready instead of throwing
    if (!this.dc || this.dc.readyState !== "open") {
      await this.waitForOpen();
    }

    if (this.dc!.bufferedAmount > DC_BUFFER_THRESHOLD) {
      await new Promise<void>((resolve) => {
        this.drainResolvers.push(resolve);
      });
    }

    this.dc!.send(data);
  }

  /** Register a handler for incoming binary frames. */
  onData(handler: DataHandler): () => void {
    this.dataHandlers.add(handler);
    return () => this.dataHandlers.delete(handler);
  }

  /** Register a handler for connection state changes. */
  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  get dataChannelState(): RTCDataChannelState | "unavailable" {
    return this.dc?.readyState ?? "unavailable";
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  // ── Private Handlers ─────────────────────────────────────────────────────

  private _attachPcHandlers(): void {
    // Forward ICE candidates to the remote peer via signaling.
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log(`[PeerConnection] New ICE candidate for ${this.remotePeerId}:`, candidate.type);
        this.signaling.sendIce(this.remotePeerId, candidate.toJSON());
      }
    };

    // The non-initiator receives the DataChannel that the initiator created.
    this.pc.ondatachannel = ({ channel }) => {
      console.log(`[PeerConnection] DataChannel received from ${this.remotePeerId}`);
      this.dc = channel;
      this._attachDcHandlers(channel);
    };

    this.pc.onconnectionstatechange = () => {
      console.log(`[PeerConnection] State change with ${this.remotePeerId}:`, this.pc.connectionState);
      this.stateHandlers.forEach((h) => h(this.pc.connectionState));
    };
  }

  private _attachDcHandlers(dc: RTCDataChannel): void {
    dc.binaryType = "arraybuffer";
    // Crucial for ultra-high speed: Fire backpressure event while we still have 256KB 
    // in flight so we can refill the pipeline before the network starves!
    dc.bufferedAmountLowThreshold = 262_144; 

    // If the DataChannel is already open by the time we attach handlers
    // (can happen on the receiver side), fire the open event manually.
    if (dc.readyState === "open") {
      this.stateHandlers.forEach((h) => h("open"));
    }

    dc.onopen = () => {
      this.stateHandlers.forEach((h) => h(dc.readyState));
    };

    dc.onclose = () => {
      this.stateHandlers.forEach((h) => h(dc.readyState));
    };

    dc.onbufferedamountlow = () => {
      // Drain any waiters blocked in sendBinary().
      const resolvers = this.drainResolvers.splice(0);
      resolvers.forEach((r) => r());
    };

    dc.onmessage = ({ data }) => {
      // ── Safari iOS WebKit Bug Fix ─────────────────────────────────────────
      // Despite setting binaryType = "arraybuffer", Safari iOS delivers
      // DataChannel binary messages as Blob objects. The old `instanceof
      // ArrayBuffer` check silently dropped ALL chunks on iPhone (0% forever).
      // We normalise both cases here.
      if (data instanceof ArrayBuffer) {
        this.dataHandlers.forEach((h) => h(data));
      } else if (data instanceof Blob) {
        // Async conversion — Blob.arrayBuffer() is supported in all modern browsers
        data.arrayBuffer().then((buf) => {
          this.dataHandlers.forEach((h) => h(buf));
        }).catch((err) => {
          console.error("[PeerConnection] Blob→ArrayBuffer conversion failed", err);
        });
      }
    };
  }
}
