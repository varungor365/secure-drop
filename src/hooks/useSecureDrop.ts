/**
 * Secure-Drop — Master Orchestration Hook
 * =========================================
 * Top-level hook that wires together:
 *   - SignalingClient (WebSocket connection / peer events)
 *   - CryptoService (ECDH key pair + per-peer session key derivation)
 *   - PeerConnection (WebRTC DataChannel management)
 *   - ChunkTransfer (encrypt-send / receive-decrypt-assemble)
 *   - IntegrityVerifier (post-transfer SHA-256 check)
 *
 * Exposes a single, typed SecureDropState object plus action dispatchers.
 * All state mutations are consolidated here; UI components are pure consumers.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { SignalingClient } from "@/engine/SignalingClient";
import { PeerConnection } from "@/engine/PeerConnection";
import {
  generateSessionKeyPair,
  importPeerPublicKey,
  deriveSharedSessionKey,
  computeSha256,
} from "@/engine/CryptoService";
import {
  sendEncryptedFile,
  receiveEncryptedFile,
  triggerDownload,
} from "@/engine/ChunkTransfer";
import { verifyTransferIntegrity } from "@/engine/IntegrityVerifier";
import { getReceivedChunkIndices, getAllTransfers, saveTransfer, clearAllHistory } from "@/lib/db";
import { ADJECTIVES, NOUNS, resolveSignalingUrl, CHUNK_SIZE_BYTES } from "@/lib/constants";
import type {
  Peer,
  TransferSession,
  FileMetadata,
  SessionKeyPair,
  DerivedSessionKey,
  SecureDropState,
  SignalingMessage,
} from "@/types/transfer";
// UUID generation via crypto.randomUUID (Web Crypto API — available in all modern browsers)

// ── Utility ───────────────────────────────────────────────────────────────

function generateLocalLabel(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

function getDeviceHint(): string {
  const ua = navigator.userAgent;
  const browser = ua.includes("Chrome") ? "Chrome"
    : ua.includes("Firefox") ? "Firefox"
      : ua.includes("Safari") ? "Safari"
        : "Browser";
  const os = ua.includes("Mac") ? "macOS"
    : ua.includes("Win") ? "Windows"
      : ua.includes("Android") ? "Android"
        : "Linux" ? "Linux"
          : "Unknown OS";
  return `${browser} / ${os}`;
}

function playSuccessFeedback() {
  if (typeof window !== "undefined" && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.2); // C6
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSecureDrop() {
  const localLabel = useRef(generateLocalLabel());
  const deviceHint = useRef(getDeviceHint());

  // Signaling client singleton
  const signalingRef = useRef<SignalingClient | null>(null);

  // Our ECDH key pair for this session
  const keyPairRef = useRef<SessionKeyPair | null>(null);

  // Map of peerId → derived AES session key
  const sessionKeysRef = useRef<Map<string, DerivedSessionKey>>(new Map());

  // Map of peerId → PeerConnection instance
  const connectionsRef = useRef<Map<string, PeerConnection>>(new Map());

  // localPeerId stored in a ref so stable closures can read the current value
  const localPeerIdRef = useRef<string | null>(null);

  // Always-current reference to _beginSendTransfer — avoids stale closure in
  // handleSignalingMessage (which has [] deps for a stable identity).
  const _beginSendTransferRef = useRef<(peerId: string) => Promise<void>>(async () => { });

  // Typed map of outbound pending transfers: toPeerId → { file, transferId }
  const pendingTransfersRef = useRef<Map<string, { file: File; transferId: string }>>(new Map());

  // AbortControllers for active send transfers: transferId → AbortController
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Receiver-ready resolvers: peerId → resolve() called when phone sends receiver-ready signal
  const receiverReadyResolversRef = useRef<Map<string, () => void>>(new Map());

  // ── React State ────────────────────────────────────────────────────────

  const [state, setState] = useState<SecureDropState>({
    localPeerId: null,
    serverLanIp: null,
    localLabel: localLabel.current,
    signalingStatus: "connecting",
    peers: [],
    transfers: [],
    incomingRequest: null,
    sessionFingerprints: {},
  });

  const patchState = useCallback(
    (patch: Partial<SecureDropState>) =>
      setState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const patchTransfer = useCallback(
    (id: string, patch: Partial<TransferSession>) => {
      setState((prev) => {
        const nextTransfers = prev.transfers.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        );
        // Persist to IDB if saving important state to avoid spamming on progress
        if ("state" in patch || "integrityVerified" in patch) {
          const updated = nextTransfers.find((t) => t.id === id);
          if (updated) saveTransfer(updated).catch(console.error);
        }
        return { ...prev, transfers: nextTransfers };
      });
    },
    [],
  );

  // ── Signaling Message Router (ref-based to avoid stale closures) ──────────
  // The ref is updated every render so the handler always has current state.
  const handleSignalingMessageRef = useRef<(msg: SignalingMessage) => Promise<void>>(async () => { });

  // ── Connection Setup ───────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function init() {
      // 1. Load history
      try {
        const history = await getAllTransfers();
        // Reset any "transferring" or "encrypting" pending transfers from previous crashes to "failed"
        const cleanedHistory = history.map(t => {
          if (["pending", "negotiating", "encrypting", "transferring", "verifying"].includes(t.state)) {
            return { ...t, state: "failed" as const };
          }
          return t;
        });
        if (isMounted) patchState({ transfers: cleanedHistory });
      } catch (err) {
        console.error("Failed to load transfer history", err);
      }

      keyPairRef.current = await generateSessionKeyPair();

      const client = new SignalingClient(
        resolveSignalingUrl(),
        localLabel.current,
        deviceHint.current,
      );
      signalingRef.current = client;

      client.onStatusChange((status) => {
        if (isMounted) patchState({ signalingStatus: status });
      });

      // Always delegate to the ref so we get the latest handler without re-subscribing.
      client.onMessage((msg) => {
        if (isMounted) handleSignalingMessageRef.current(msg);
      });

      client.connect();
    }

    init();

    return () => {
      isMounted = false;
      signalingRef.current?.disconnect();
      connectionsRef.current.forEach((c) => c.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Signaling Message Router ───────────────────────────────────────────

  // The actual handler — defined fresh each render so it captures current state.
  // Assigned to the ref at the bottom of the hook body.
  const handleSignalingMessage = async (msg: SignalingMessage) => {
    const signaling = signalingRef.current!;

    switch (msg.type) {
      case "welcome":
        patchState({ localPeerId: msg.peerId, serverLanIp: msg.serverLanIp });
        localPeerIdRef.current = msg.peerId;
        break;

      case "peer-list":
        setState((prev) => ({ ...prev, peers: msg.peers }));
        break;

      case "peer-joined":
        setState((prev) => ({
          ...prev,
          peers: [...prev.peers.filter((p) => p.id !== msg.peer.id), msg.peer],
        }));
        break;

      case "peer-updated":
        setState((prev) => ({
          ...prev,
          peers: prev.peers.map((p) =>
            p.id === msg.peer.id ? { ...p, ...msg.peer } : p
          ),
        }));
        break;
      case "peer-left":
        setState((prev) => ({
          ...prev,
          peers: prev.peers.filter((p) => p.id !== msg.peerId),
        }));
        connectionsRef.current.get(msg.peerId)?.close();
        connectionsRef.current.delete(msg.peerId);
        sessionKeysRef.current.delete(msg.peerId);
        break;

      case "offer": {
        const conn = new PeerConnection(msg.fromPeerId, signaling, false);
        connectionsRef.current.set(msg.fromPeerId, conn);
        _attachConnectionHandlers(conn, msg.fromPeerId);
        await conn.receiveOffer(msg.sdp);
        signaling.send({
          type: "ecdh-pubkey",
          toPeerId: msg.fromPeerId,
          publicKeyJwk: keyPairRef.current!.publicKeyJwk,
        });
        break;
      }

      case "answer":
        await connectionsRef.current.get(msg.fromPeerId)?.receiveAnswer(msg.sdp);
        break;

      case "ice":
        await connectionsRef.current.get(msg.fromPeerId)?.addIceCandidate(msg.candidate);
        break;

      case "ecdh-pubkey": {
        const theirKey = await importPeerPublicKey(msg.publicKeyJwk as JsonWebKey);
        const remoteId = msg.fromPeerId;
        // ALWAYS use ref — state.localPeerId can be stale (null) in async closures
        const localId = localPeerIdRef.current ?? "";
        const canonicalId = [localId, remoteId].sort().join("|");
        
        const sessionKey = await deriveSharedSessionKey(
          keyPairRef.current!.privateKey,
          theirKey,
          canonicalId // CRITICAL: Must be identical on both peers
        );
        sessionKeysRef.current.set(remoteId, sessionKey);
        setState((prev) => ({
          ...prev,
          sessionFingerprints: { ...prev.sessionFingerprints, [remoteId]: sessionKey.fingerprint },
        }));

        // If we are the sender, also respond with our own ECDH pubkey so the
        // receiver can derive the same session key on their side.
        const hasPending = pendingTransfersRef.current.has(remoteId);
        if (hasPending && keyPairRef.current) {
          signalingRef.current!.send({
            type: "ecdh-pubkey",
            toPeerId: remoteId,
            publicKeyJwk: keyPairRef.current.publicKeyJwk,
          });
        }
        break;
      }

      case "transfer-request":
        setState((prev) => ({
          ...prev,
          incomingRequest: {
            fromPeer: prev.peers.find((p) => p.id === msg.fromPeerId) ?? {
              id: msg.fromPeerId, label: "Unknown", deviceHint: "",
              lastSeen: Date.now(), connected: true,
            },
            meta: msg.meta,
          },
        }));
        break;

      case "transfer-accepted":
        _beginSendTransferRef.current(msg.fromPeerId);
        break;

      case "transfer-rejected":
        setState((prev) => ({
          ...prev,
          transfers: prev.transfers.map((t) =>
            t.peerId === msg.fromPeerId && t.state === "pending"
              ? { ...t, state: "rejected" } : t,
          ),
        }));
        break;

      case "transfer-resume-request": {
        const indices = await getReceivedChunkIndices(msg.transferId);
        signaling.send({
          type: "transfer-resume-accepted",
          toPeerId: msg.fromPeerId,
          chunksReceived: Array.from(indices),
        });

        // Setup WebRTC receive like acceptTransfer but without UI prompt
        const transfer = state.transfers.find(t => t.id === msg.transferId);
        if (transfer && transfer.direction === "receive" && transfer.state === "failed") {
          patchTransfer(msg.transferId, { state: "transferring" });

          try {
            const waitForKey = () => new Promise<DerivedSessionKey>((resolve) => {
              const check = () => {
                const key = sessionKeysRef.current.get(msg.fromPeerId);
                if (key) return resolve(key);
                setTimeout(check, 100);
              };
              check();
            });
            const sessionKey = await waitForKey();
            const conn = connectionsRef.current.get(msg.fromPeerId)!;
            const startTime = Date.now();
            const fileBuffer = await receiveEncryptedFile(
              msg.transferId,
              sessionKey.aesKey,
              transfer.meta,
              (handler) => conn.onData(handler),
              (received, total) => {
                const elapsed = (Date.now() - startTime) / 1000;
                patchTransfer(msg.transferId, {
                  chunksTransferred: received,
                  speedBps: elapsed > 0 ? (received * CHUNK_SIZE_BYTES) / elapsed : 0,
                  state: "transferring",
                });
              },
            );

            patchTransfer(msg.transferId, { state: "verifying" });
            const result = await verifyTransferIntegrity(fileBuffer, transfer.meta.sha256);
            patchTransfer(msg.transferId, {
              state: "completed",
              completedAt: Date.now(),
              integrityVerified: result.status === "verified",
            });
            triggerDownload(fileBuffer, transfer.meta.name, transfer.meta.mimeType);
          } catch (err) {
            patchTransfer(msg.transferId, { state: "failed" });
          }
        }
        break;
      }

      case "transfer-resume-accepted": {
        const pending = pendingTransfersRef.current.get(msg.fromPeerId);
        if (pending) {
          const { file, transferId } = pending;
          const transfer = state.transfers.find(t => t.id === transferId);
          if (transfer) {
            const missingIndices = Array.from({ length: transfer.meta.totalChunks }, (_, i) => i)
              .filter(i => !msg.chunksReceived.includes(i));

            _beginSendTransferRef.current(msg.fromPeerId, missingIndices);
          }
        }
        break;
      }
      case "receiver-ready": {
        // Phone signals Mac that it has registered its onData handler and is ready to receive.
        const resolve = receiverReadyResolversRef.current.get(msg.fromPeerId);
        if (resolve) {
          resolve();
          receiverReadyResolversRef.current.delete(msg.fromPeerId);
        }
        break;
      }
    }
  };

  // Update ref every render — keeps the signaling listener current.
  handleSignalingMessageRef.current = handleSignalingMessage;

  // ── DataChannel Event Handlers ─────────────────────────────────────────

  const _attachConnectionHandlers = (conn: PeerConnection, peerId: string) => {
    conn.onStateChange((channelState) => {
      if (channelState === "open") {
        setState((prev) => ({
          ...prev,
          peers: prev.peers.map((p) =>
            p.id === peerId ? { ...p, connected: true } : p,
          ),
        }));
      } else if (channelState === "closed" || channelState === "failed") {
        setState((prev) => ({
          ...prev,
          peers: prev.peers.map((p) =>
            p.id === peerId ? { ...p, connected: false } : p,
          ),
        }));
      }
    });

    // Note: The actual chunk data handler is registered inside receiveEncryptedFile().
    // This stub is intentionally empty — the DataChannel's onData is re-registered
    // per transfer session inside acceptTransfer() via conn.onData(handler).
  };

  // ── Public Actions ─────────────────────────────────────────────────────

  /**
   * Initiate a WebRTC connection + ECDH exchange with a remote peer,
   * then send a transfer-request over signaling.
   */
  const sendFileRequest = useCallback(
    async (toPeerId: string, file: File) => {
      const signaling = signalingRef.current!;

      // Step 1: Compute SHA-256 of the file before encryption.
      const fileBuffer = await file.arrayBuffer();
      const sha256 = await computeSha256(fileBuffer);

      const meta: FileMetadata = {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE_BYTES),
        sha256,
      };

      const transferId = `${toPeerId}-send-${Date.now()}`;

      // Step 2: Create WebRTC connection and initiate offer.
      const conn = new PeerConnection(toPeerId, signaling, true);
      connectionsRef.current.set(toPeerId, conn);
      _attachConnectionHandlers(conn, toPeerId);
      await conn.initiateOffer();

      // Step 3: Send our ECDH public key.
      signaling.send({
        type: "ecdh-pubkey",
        toPeerId,
        publicKeyJwk: keyPairRef.current!.publicKeyJwk,
      });

      // Step 4: Create a pending transfer record in state.
      const transferOut: TransferSession = {
        id: transferId,
        peerId: toPeerId,
        direction: "send",
        meta,
        state: "pending",
        chunksTransferred: 0,
        startedAt: Date.now(),
        completedAt: 0,
        speedBps: 0,
        integrityVerified: null,
      };

      setState((prev) => ({
        ...prev,
        transfers: [...prev.transfers, transferOut],
      }));
      saveTransfer(transferOut).catch(console.error);

      // Step 5: Send transfer-request over signaling (metadata only).
      signaling.sendTransferRequest(toPeerId, meta);

      // Store pending transfer so _beginSendTransfer can retrieve it when accepted.
      pendingTransfersRef.current.set(toPeerId, { file, transferId });
    },
    [],
  );

  /**
   * Accept an incoming transfer request from a peer.
   * Derives session key and begins receiving chunks.
   */
  const acceptTransfer = useCallback(
    async () => {
      const { incomingRequest } = state;
      if (!incomingRequest) return;
      const { fromPeer, meta } = incomingRequest;

      patchState({ incomingRequest: null });
      signalingRef.current!.sendTransferAccepted(fromPeer.id);

      const transferId = `${fromPeer.id}-recv-${Date.now()}`;
      const transferIn: TransferSession = {
        id: transferId,
        peerId: fromPeer.id,
        direction: "receive",
        meta,
        state: "transferring",
        chunksTransferred: 0,
        startedAt: Date.now(),
        completedAt: 0,
        speedBps: 0,
        integrityVerified: null,
      };

      setState((prev) => ({
        ...prev,
        transfers: [...prev.transfers, transferIn],
      }));
      saveTransfer(transferIn).catch(console.error);

      // Wait for session key to be derived (may take a moment after ECDH).
      // Times out after 20 s — prevents silent infinite hang if ECDH message is dropped.
      const waitForKey = () =>
        new Promise<DerivedSessionKey>((resolve, reject) => {
          const deadline = Date.now() + 20_000;
          const check = () => {
            const key = sessionKeysRef.current.get(fromPeer.id);
            if (key) return resolve(key);
            if (Date.now() > deadline) return reject(new Error("[useSecureDrop] ECDH key never arrived — transfer failed"));
            setTimeout(check, 100);
          };
          check();
        });

      // Wait for the WebRTC connection (offer may still be in-flight when user taps Accept).
      const waitForConn = () =>
        new Promise<import("@/engine/PeerConnection").PeerConnection>((resolve, reject) => {
          const deadline = Date.now() + 20_000;
          const check = () => {
            const c = connectionsRef.current.get(fromPeer.id);
            if (c) return resolve(c);
            if (Date.now() > deadline) return reject(new Error("[useSecureDrop] WebRTC connection never established"));
            setTimeout(check, 100);
          };
          check();
        });

      try {
        // Resolve both the session key AND the connection (either may arrive first).
        const [sessionKey, conn] = await Promise.all([waitForKey(), waitForConn()]);

        patchTransfer(transferId, { state: "transferring" });

        const startTime = Date.now();
        const fileBuffer = await receiveEncryptedFile(
          transferId,
          sessionKey.aesKey,
          meta,
          (handler) => {
            const cleanup = conn.onData(handler);
            // ── Signal the sender that we are ready to receive ──────────────
            // This replaces the blind fixed delay on the sender side. The Mac will
            // not start pumping chunks until it receives this signal (or times out).
            signalingRef.current!.send({ type: "receiver-ready", toPeerId: fromPeer.id });
            return cleanup;
          },
          (received, total) => {
            const elapsed = (Date.now() - startTime) / 1000;
            const bytesReceived = received * CHUNK_SIZE_BYTES;
            const speedBps = elapsed > 0 ? bytesReceived / elapsed : 0;
            patchTransfer(transferId, {
              chunksTransferred: received,
              speedBps,
              state: "transferring",
            });
          },
        );

        patchTransfer(transferId, { state: "verifying" });

        const result = await verifyTransferIntegrity(fileBuffer, meta.sha256);

        patchTransfer(transferId, {
          state: "completed",
          completedAt: Date.now(),
          integrityVerified: result.status === "verified",
        });

        playSuccessFeedback();
        triggerDownload(fileBuffer, meta.name, meta.mimeType);
      } catch (err) {
        console.error("[useSecureDrop] Receive transfer error:", err);
        patchTransfer(transferId, { state: "failed" });
      }
    },
    [state, patchState, patchTransfer],
  );

const rejectTransfer = useCallback(() => {
  const { incomingRequest } = state;
  if (!incomingRequest) return;
  signalingRef.current!.sendTransferRejected(incomingRequest.fromPeer.id);
  patchState({ incomingRequest: null });
}, [state, patchState]);

// Internal: begin actual file send after transfer-accepted signal.
const _beginSendTransfer = useCallback(
  async (fromPeerId: string, missingIndices: number[] | null = null) => {
    const conn = connectionsRef.current.get(fromPeerId);
    if (!conn) return;
    const pending = pendingTransfersRef.current.get(fromPeerId);
    if (!pending) return;
    const { file, transferId } = pending;

    const waitForKey = () =>
      new Promise<DerivedSessionKey>((resolve, reject) => {
        const deadline = Date.now() + 20_000;
        const check = () => {
          const key = sessionKeysRef.current.get(fromPeerId);
          if (key) return resolve(key);
          if (Date.now() > deadline) return reject(new Error("[useSecureDrop] Sender ECDH key never arrived"));
          setTimeout(check, 100);
        };
        check();
      });

    try {
      const sessionKey = await waitForKey();

      // ── Wait for receiver-ready signal (or fallback after 8s) ──────────
      // The phone sends 'receiver-ready' after registering its onData handler.
      // This is far more reliable than a fixed delay — it's an explicit handshake.
      await new Promise<void>((resolve) => {
        // Store resolver so the signaling handler can call it.
        receiverReadyResolversRef.current.set(fromPeerId, resolve);
        // Safety fallback: if signal is dropped, start anyway after 8s.
        setTimeout(() => {
          receiverReadyResolversRef.current.delete(fromPeerId);
          resolve();
        }, 8_000);
      });
      patchTransfer(transferId, { state: "encrypting" });

      const abortController = new AbortController();
      abortControllersRef.current.set(transferId, abortController);

      const startTime = Date.now();
      await sendEncryptedFile(file, sessionKey.aesKey, conn, missingIndices, (sent, total) => {
        const elapsed = (Date.now() - startTime) / 1000;
        const bytesSent = sent * CHUNK_SIZE_BYTES;
        const speedBps = elapsed > 0 ? bytesSent / elapsed : 0;
        patchTransfer(transferId, {
          chunksTransferred: sent,
          speedBps,
          state: "transferring",
        });
      }, abortController.signal);

      abortControllersRef.current.delete(transferId);
      patchTransfer(transferId, {
        state: "completed",
        completedAt: Date.now(),
        integrityVerified: true,
      });
      playSuccessFeedback();
    } catch (err: any) {
      abortControllersRef.current.delete(transferId);
      if (err?.name === "AbortError") {
        console.log("[useSecureDrop] Transfer cancelled by user");
        patchTransfer(transferId, { state: "failed" });
      } else {
        console.error("[useSecureDrop] Send transfer error:", err);
        patchTransfer(transferId, { state: "failed" });
      }
    }
  },
  [patchTransfer],
);

// Keep the ref current on every render so handleSignalingMessage (stable [])
// always dispatches to the latest version of _beginSendTransfer.
_beginSendTransferRef.current = _beginSendTransfer;

const updateLocalLabel = useCallback((label: string) => {
  localLabel.current = label;
  patchState({ localLabel: label });
  // Broadcast name change to all peers via signaling server
  signalingRef.current?.send({ type: "update-label", label });
}, [patchState]);

const resumeTransfer = useCallback(async (transferId: string) => {
  const transfer = state.transfers.find(t => t.id === transferId);
  if (!transfer || transfer.state !== "failed") return;

  if (transfer.direction === "send") {
    patchTransfer(transferId, { state: "negotiating" });
    const conn = new PeerConnection(transfer.peerId, signalingRef.current!, true);
    connectionsRef.current.set(transfer.peerId, conn);
    _attachConnectionHandlers(conn, transfer.peerId);
    await conn.initiateOffer();

    signalingRef.current!.send({
      type: "ecdh-pubkey",
      toPeerId: transfer.peerId,
      publicKeyJwk: keyPairRef.current!.publicKeyJwk,
    });

    signalingRef.current!.send({
      type: "transfer-resume-request",
      toPeerId: transfer.peerId,
      transferId
    });
  }
  // Receiver resume not initiated from UI (they listen for resume-request)
}, [state.transfers, patchTransfer]);

const cancelTransfer = useCallback((transferId: string) => {
  // Abort the send if it's in progress
  const controller = abortControllersRef.current.get(transferId);
  if (controller) {
    controller.abort();
    abortControllersRef.current.delete(transferId);
  }

  // Close the peer connection
  const transfer = state.transfers.find(t => t.id === transferId);
  if (transfer) {
    const conn = connectionsRef.current.get(transfer.peerId);
    if (conn) {
      conn.close();
      connectionsRef.current.delete(transfer.peerId);
    }
  }

  patchTransfer(transferId, { state: "failed" });
}, [state.transfers, patchTransfer]);

const clearHistory = useCallback(async () => {
  await clearAllHistory();
  patchState({ transfers: [] });
}, [patchState]);

return {
  state,
  updateLocalLabel,
  sendFileRequest,
  acceptTransfer,
  rejectTransfer,
  resumeTransfer,
  cancelTransfer,
  clearHistory,
};
}
