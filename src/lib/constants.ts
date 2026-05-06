/**
 * Secure-Drop — Application Constants
 *
 * All magic numbers, timeouts, and protocol parameters are centralised here.
 * Import constants from this module — never hard-code values elsewhere.
 */

/** WebSocket signaling server connection (defaults to LAN loopback in dev). */
export const SIGNALING_URL: string = resolveSignalingUrl();

/**
 * Resolve the signaling URL at runtime.
 * Priority:
 *   1. VITE_SIGNALING_URL build-time env (set on Vercel for production)
 *   2. ?ws= URL param (QR join flow)
 *   3. /ws proxy through current host (local dev via Vite proxy)
 *   4. ws://localhost:8765 fallback
 */
export function resolveSignalingUrl(): string {
  if (typeof window !== "undefined") {
    // 2. ?ws= override from QR code
    const qs = new URLSearchParams(window.location.search).get("ws");
    if (qs) return qs;

    // 3. If running on Vercel or any public domain, use the Render URL.
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "wss://secure-drop-bamd.onrender.com";
    }

    // 4. Route through same host via Vite's /ws proxy (local dev).
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
  }

  // 5. Fallback
  return "ws://localhost:8765";
}
/**
 * Returns the current page origin (for QR code generation).
 * e.g. "http://192.168.1.10:5173"
 */
export function resolveAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5173";
}

/**
 * WebRTC DataChannel chunk size in bytes.
 * 256 KB maximizes throughput while staying safely below SCTP limits.
 */
export const CHUNK_SIZE_BYTES = 262_144; // 256 KB — maximizes DataChannel throughput

/**
 * Maximum number of WebRTC DataChannel bytes allowed to queue
 * before the sender pauses and waits for drain.
 * 1 MB buffer prevents quota exceeded errors on strict browsers like Safari iOS.
 */
export const DC_BUFFER_THRESHOLD = 1_048_576; // 1 MB

/** AES-256-GCM IV length in bytes (NIST SP 800-38D §8.2). */
export const GCM_IV_LENGTH = 12;

/** AES-256-GCM authentication tag length in bits. */
export const GCM_TAG_BITS = 128;

/** ECDH key curve — P-256 per NIST FIPS 186-4. */
export const ECDH_CURVE = "P-256" as const;

/** Binary frame header size in bytes:
 *  4 (chunkIndex) + 4 (totalChunks) + 12 (IV) = 20 bytes */
export const FRAME_HEADER_SIZE = 20;

/** Reconnect backoff: initial wait before retrying signaling connection (ms). */
export const RECONNECT_INITIAL_MS = 1_000;

/** Reconnect backoff: maximum wait cap (ms). */
export const RECONNECT_MAX_MS = 30_000;

/** Reconnect backoff: exponential multiplier. */
export const RECONNECT_BACKOFF_FACTOR = 2;

/** Interval at which the UI polls for speed/ETA recalculation (ms). */
export const SPEED_SAMPLE_INTERVAL_MS = 1_000;

/** STUN/TURN servers used for WebRTC ICE negotiation (allows Cellular routing). */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp"
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

/** Label auto-generation wordlists. */
export const ADJECTIVES = [
  "Quantum", "Orbital", "Stellar", "Cryptic", "Silent",
  "Phantom", "Vector", "Cipher", "Atomic", "Nexus",
];

export const NOUNS = [
  "Node", "Relay", "Beacon", "Vault", "Proxy",
  "Link", "Core", "Gate", "Pulse", "Mesh",
];
