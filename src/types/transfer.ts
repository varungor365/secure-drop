/**
 * Secure-Drop — Shared TypeScript Type Definitions
 *
 * Single source of truth for all entities that flow through the
 * signaling, crypto, and transfer layers.
 *
 * Author: Secure-Drop Engineering
 * Protocol: WebRTC + ECDH P-256 + AES-256-GCM
 */

// ─── Peer & Discovery ────────────────────────────────────────────────────────

/** A remote device visible on the local network via mDNS discovery. */
export interface Peer {
  /** Stable UUID assigned by the signaling server upon connection. */
  id: string;
  /** Human-readable label: hostname or auto-generated adjective-noun pair. */
  label: string;
  /** Browser / device hint reported by the peer (e.g. "Chrome / macOS"). */
  deviceHint: string;
  /** Epoch ms of when the peer was last seen in a discovery broadcast. */
  lastSeen: number;
  /** Whether a live WebRTC DataChannel to this peer exists. */
  connected: boolean;
}

// ─── Signaling Protocol Messages ─────────────────────────────────────────────

/** Discriminated union for all WebSocket signaling message types. */
export type SignalingMessage =
  | { type: "welcome";     peerId: string; serverLanIp?: string }
  | { type: "peer-list";   peers: Peer[] }
  | { type: "peer-joined"; peer: Peer }
  | { type: "peer-left";   peerId: string }
  | { type: "offer";       fromPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer";      fromPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice";         fromPeerId: string; candidate: RTCIceCandidateInit }
  | { type: "transfer-request"; fromPeerId: string; meta: FileMetadata }
  | { type: "transfer-accepted"; fromPeerId: string }
  | { type: "transfer-rejected"; fromPeerId: string }
  | { type: "transfer-resume-request"; fromPeerId: string; transferId: string }
  | { type: "transfer-resume-accepted"; fromPeerId: string; chunksReceived: number[] }
  | { type: "ecdh-pubkey"; fromPeerId: string; publicKeyJwk: JsonWebKey }
  | { type: "receiver-ready"; fromPeerId: string };

// ─── Cryptographic Keys ───────────────────────────────────────────────────────

/** ECDH P-256 key pair generated fresh for each session. */
export interface SessionKeyPair {
  /** Private key — stays in memory only, never serialised. */
  privateKey: CryptoKey;
  /** Public key — exported as raw bytes and sent over signaling channel. */
  publicKey: CryptoKey;
  /** JWK-serialised public key for transmission over the signaling channel. */
  publicKeyJwk: JsonWebKey;
}

/** Derived symmetric key for a bilateral session with one peer. */
export interface DerivedSessionKey {
  /** AES-256-GCM CryptoKey derived via ECDH shared-secret + HKDF. */
  aesKey: CryptoKey;
  /** ID of the peer this key was derived with. */
  peerId: string;
  /** 8-character hex fingerprint derived from the shared secret (e.g. "A3F2·9C41"). */
  fingerprint: string;
}

// ─── File Transfer ────────────────────────────────────────────────────────────

/** Metadata exchanged before any encrypted bytes are sent. */
export interface FileMetadata {
  /** Original file name. */
  name: string;
  /** MIME type (e.g. "application/pdf"). */
  mimeType: string;
  /** Total file size in bytes (pre-encryption). */
  size: number;
  /** Total number of 16 KB chunks this file is split into. */
  totalChunks: number;
  /** SHA-256 hex digest of the entire plaintext file. */
  sha256: string;
}

/** A single in-flight or completed file transfer session. */
export interface TransferSession {
  /** Unique transfer ID (UUID). */
  id: string;
  /** Peer involved in this transfer. */
  peerId: string;
  /** Transfer direction from the local peer's perspective. */
  direction: "send" | "receive";
  /** File metadata negotiated during the handshake. */
  meta: FileMetadata;
  /** Overall transfer lifecycle state. */
  state: TransferState;
  /** Number of chunks successfully transferred. */
  chunksTransferred: number;
  /** Transfer start timestamp (epoch ms). */
  startedAt: number;
  /** Transfer completion timestamp (epoch ms), 0 if in progress. */
  completedAt: number;
  /** Computed transfer speed in bytes/second. */
  speedBps: number;
  /** Whether the SHA-256 post-transfer integrity check passed. */
  integrityVerified: boolean | null;
}

/** All possible states a transfer session can be in. */
export type TransferState =
  | "pending"      // Waiting for receiver to accept
  | "negotiating"  // WebRTC handshake in progress
  | "encrypting"   // Sender is encrypting chunks
  | "transferring" // Data is flowing over DataChannel
  | "verifying"    // SHA-256 integrity check running
  | "completed"    // Transfer finished and verified
  | "failed"       // Unrecoverable error
  | "rejected";    // Receiver declined

// ─── Chunk Protocol ───────────────────────────────────────────────────────────

/**
 * Binary frame format transmitted over WebRTC DataChannel.
 * Header is a fixed 20-byte prefix followed by the encrypted payload.
 *
 * Layout (little-endian):
 *   [0..3]   chunkIndex  (Uint32)
 *   [4..7]   totalChunks (Uint32)
 *   [8..19]  IV          (12 bytes, 96-bit nonce for AES-256-GCM)
 *   [20..]   ciphertext  (variable)
 */
export interface ChunkFrameHeader {
  chunkIndex: number;
  totalChunks: number;
  iv: Uint8Array; // 12 bytes
}

// ─── Application State ────────────────────────────────────────────────────────

/** Top-level state exposed by the useSecureDrop hook. */
export interface SecureDropState {
  /** This device's signaling ID. */
  localPeerId: string | null;
  /** Active backend network IPv4 */
  serverLanIp: string | null;
  /** Human-readable local device label (editable). */
  localLabel: string;
  /** Signaling server connection state. */
  signalingStatus: "connecting" | "connected" | "disconnected" | "error";
  /** All peers currently discovered on the LAN. */
  peers: Peer[];
  /** All transfer sessions (active and completed). */
  transfers: TransferSession[];
  /** Incoming transfer request waiting for user acceptance. */
  incomingRequest: { fromPeer: Peer; meta: FileMetadata } | null;
  /** Session fingerprints by peerId for MITM verification. */
  sessionFingerprints: Record<string, string>;
}
