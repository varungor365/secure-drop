/**
 * Secure-Drop — WebSocket Signaling Client
 * ==========================================
 * Manages the bidirectional WebSocket connection to the Python signaling
 * server. Handles:
 *   - Initial peer registration (label + device hint)
 *   - Automatic reconnection with exponential backoff
 *   - Typed message dispatch via listener map
 *   - Clean teardown on unmount
 *
 * This module is purely a transport abstraction — it carries SDP/ICE
 * metadata only. No file data ever flows through this channel.
 */

import {
  RECONNECT_INITIAL_MS,
  RECONNECT_MAX_MS,
  RECONNECT_BACKOFF_FACTOR,
  SIGNALING_URL,
} from "@/lib/constants";
import type { SignalingMessage } from "@/types/transfer";

type MessageHandler = (msg: SignalingMessage) => void;
type StatusChangeHandler = (status: SignalingClientStatus) => void;

export type SignalingClientStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export class SignalingClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = RECONNECT_INITIAL_MS;
  private shouldReconnect = true;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private currentStatus: SignalingClientStatus = "disconnected";

  constructor(
    private readonly url: string = SIGNALING_URL,
    private readonly localLabel: string = "Unknown Device",
    private readonly deviceHint: string = "Browser",
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Open the WebSocket connection and begin the registration handshake. */
  connect(): void {
    this.shouldReconnect = true;
    this._openSocket();
  }

  /** Close the WebSocket and disable automatic reconnection. */
  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close(1000, "Client disconnect");
    this.ws = null;
    this._setStatus("disconnected");
  }

  // ── Message API ──────────────────────────────────────────────────────────

  /**
   * Send a typed JSON message to the signaling server.
   * Silently drops the message if the socket is not open.
   */
  send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn("[SignalingClient] Cannot send — socket not open", payload);
    }
  }

  /** Register a handler to receive all incoming SignalingMessages. */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** Register a handler for connection status changes. */
  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  get status(): SignalingClientStatus {
    return this.currentStatus;
  }

  // ── Convenience Senders ──────────────────────────────────────────────────

  sendOffer(toPeerId: string, sdp: RTCSessionDescriptionInit): void {
    this.send({ type: "offer", toPeerId, sdp });
  }

  sendAnswer(toPeerId: string, sdp: RTCSessionDescriptionInit): void {
    this.send({ type: "answer", toPeerId, sdp });
  }

  sendIce(toPeerId: string, candidate: RTCIceCandidateInit): void {
    this.send({ type: "ice", toPeerId, candidate });
  }

  sendTransferRequest(toPeerId: string, meta: unknown): void {
    this.send({ type: "transfer-request", toPeerId, meta });
  }

  sendTransferAccepted(toPeerId: string): void {
    this.send({ type: "transfer-accepted", toPeerId });
  }

  sendTransferRejected(toPeerId: string): void {
    this.send({ type: "transfer-rejected", toPeerId });
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private _openSocket(): void {
    this._setStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = RECONNECT_INITIAL_MS; // reset backoff on success
      this._setStatus("connected");
      // Register this peer with the server.
      this.send({
        type: "register",
        label: this.localLabel,
        deviceHint: this.deviceHint,
      });
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as SignalingMessage;
        this.messageHandlers.forEach((h) => h(msg));
      } catch {
        console.error("[SignalingClient] Failed to parse message", event.data);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this._setStatus("connecting");
        this._scheduleReconnect();
      } else {
        this._setStatus("disconnected");
      }
    };

    this.ws.onerror = () => {
      this._setStatus("error");
    };
  }

  private _scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(
      delay * RECONNECT_BACKOFF_FACTOR,
      RECONNECT_MAX_MS,
    );
    console.info(`[SignalingClient] Reconnecting in ${delay}ms…`);
    setTimeout(() => {
      if (this.shouldReconnect) this._openSocket();
    }, delay);
  }

  private _setStatus(status: SignalingClientStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      this.statusHandlers.forEach((h) => h(status));
    }
  }
}
