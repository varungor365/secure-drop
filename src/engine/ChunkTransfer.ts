/**
 * Secure-Drop — Chunked File Transfer Engine
 * ===========================================
 * Handles the complete send and receive lifecycle for a single file:
 *
 * SENDER:
 *   1. Read file as ArrayBuffer
 *   2. Split into CHUNK_SIZE_BYTES slices
 *   3. For each chunk: encrypt with AES-256-GCM → frame → send via DataChannel
 *
 * RECEIVER:
 *   1. Parse each incoming binary frame (header + ciphertext)
 *   2. Decrypt ciphertext with shared AES-256-GCM key
 *   3. Store plaintext chunk by index
 *   4. On last chunk: assemble Blob → trigger browser download
 *
 * Binary Frame Layout (little-endian):
 *   Bytes  0–3  : chunkIndex  (Uint32LE)
 *   Bytes  4–7  : totalChunks (Uint32LE)
 *   Bytes  8–19 : IV          (12 bytes, AES-GCM nonce)
 *   Bytes 20–N  : ciphertext  (variable)
 */

import { CHUNK_SIZE_BYTES, FRAME_HEADER_SIZE } from "@/lib/constants";
import { encryptChunk, decryptChunk } from "./CryptoService";
import { saveChunk, getReceivedChunkIndices, getAllChunksForTransfer, deleteChunksForTransfer } from "@/lib/db";
import type { PeerConnection } from "./PeerConnection";
import type { FileMetadata } from "@/types/transfer";

/** Milliseconds of silence before a receive-side transfer is considered dead. */
const RECEIVE_IDLE_TIMEOUT_MS = 60_000;

export type ProgressCallback = (chunksTransferred: number, totalChunks: number) => void;

// ── Frame Encoding / Decoding ─────────────────────────────────────────────

/**
 * Assemble a binary frame from header fields and ciphertext.
 * Total size: FRAME_HEADER_SIZE + ciphertext.byteLength
 */
function encodeFrame(
  chunkIndex: number,
  totalChunks: number,
  iv: Uint8Array,
  ciphertext: ArrayBuffer,
): ArrayBuffer {
  const frame = new ArrayBuffer(FRAME_HEADER_SIZE + ciphertext.byteLength);
  const view = new DataView(frame);
  view.setUint32(0, chunkIndex, true);  // little-endian
  view.setUint32(4, totalChunks, true);
  new Uint8Array(frame, 8, 12).set(iv); // 12-byte IV starting at offset 8
  new Uint8Array(frame, FRAME_HEADER_SIZE).set(new Uint8Array(ciphertext));
  return frame;
}

/**
 * Parse the header and ciphertext out of a binary frame received from DataChannel.
 */
function decodeFrame(frame: ArrayBuffer): {
  chunkIndex: number;
  totalChunks: number;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
} {
  const view = new DataView(frame);
  const chunkIndex = view.getUint32(0, true);
  const totalChunks = view.getUint32(4, true);
  const iv = new Uint8Array(frame, 8, 12);
  const ciphertext = frame.slice(FRAME_HEADER_SIZE);
  return { chunkIndex, totalChunks, iv, ciphertext };
}

// ── Sender ────────────────────────────────────────────────────────────────

/** How many chunks to pre-read + pre-encrypt ahead of the send cursor. */
const PIPELINE_DEPTH = 16;

/**
 * Stream-encrypt and send a file over an established DataChannel.
 * Uses a deep pipeline: reads + encrypts up to PIPELINE_DEPTH chunks ahead
 * while earlier chunks are still being pushed over the network.
 * Supports cancellation via AbortSignal.
 */
export async function sendEncryptedFile(
  file: File,
  aesKey: CryptoKey,
  connection: PeerConnection,
  missingIndices: number[] | null = null,
  onProgress?: ProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

  // Helper: read + encrypt a single chunk
  async function prepareFrame(i: number): Promise<ArrayBuffer> {
    const start = i * CHUNK_SIZE_BYTES;
    const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
    const plainChunk = await file.slice(start, end).arrayBuffer();
    const { ciphertext, iv } = await encryptChunk(aesKey, plainChunk);
    return encodeFrame(i, totalChunks, iv, ciphertext);
  }

  // Build list of indices we actually need to send
  const sendList: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!missingIndices || missingIndices.includes(i)) sendList.push(i);
  }
  if (sendList.length === 0) return;

  // Pre-fill the pipeline
  const pending: Promise<ArrayBuffer>[] = [];
  let prepCursor = 0;
  while (prepCursor < sendList.length && pending.length < PIPELINE_DEPTH) {
    pending.push(prepareFrame(sendList[prepCursor++]));
  }

  // Drain pipeline: send the head, refill from the tail
  let sentCount = 0;
  while (pending.length > 0) {
    if (signal?.aborted) throw new DOMException("Transfer cancelled", "AbortError");

    const frame = await pending.shift()!;

    // Refill pipeline while we send
    if (prepCursor < sendList.length) {
      pending.push(prepareFrame(sendList[prepCursor++]));
    }

    await connection.sendBinary(frame);
    sentCount++;
    onProgress?.(sentCount, totalChunks);
  }
}

// ── Receiver ─────────────────────────────────────────────────────────────

/**
 * Accumulate and decrypt incoming encrypted frames, then trigger a browser download.
 *
 * @param aesKey      - The derived AES-256-GCM session key.
 * @param meta        - FileMetadata exchanged during the transfer handshake.
 * @param onFrame     - Registers the incoming frame handler on the DataChannel.
 *                      Returns a cleanup function.
 * @param onProgress  - Callback invoked after each chunk is decrypted.
 * @returns           - Assembled plaintext ArrayBuffer of the full file.
 */
export function receiveEncryptedFile(
  transferId: string,
  aesKey: CryptoKey,
  meta: FileMetadata,
  onFrame: (handler: (data: ArrayBuffer) => void) => () => void,
  onProgress?: ProgressCallback,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    let receivedCount = 0;
    let cleanup: (() => void) | null = null;
    const inMemoryChunks: (ArrayBuffer | null)[] = Array(meta.totalChunks).fill(null);
    let idbQueue = Promise.resolve();
    
    // Check initial received count in case this is a resumed transfer
    getReceivedChunkIndices(transferId).then(existing => {
      receivedCount = existing.size;
    }).catch(console.error);

    // Inactivity watchdog — rejects if no chunk arrives within the timeout.
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        cleanup?.();
        reject(new Error(
          `[ChunkTransfer] Transfer timed out — no data received for ${RECEIVE_IDLE_TIMEOUT_MS / 1000}s`,
        ));
      }, RECEIVE_IDLE_TIMEOUT_MS);
    };
    resetIdleTimer();

    cleanup = onFrame(async (frame: ArrayBuffer) => {
      resetIdleTimer(); // reset watchdog on every incoming chunk
      try {
        const { chunkIndex, totalChunks, iv, ciphertext } = decodeFrame(frame);
        const plaintext = await decryptChunk(aesKey, iv, ciphertext);
        
        inMemoryChunks[chunkIndex] = plaintext;
        
        // Push IDB write to a sequential background queue to avoid transaction flooding
        idbQueue = idbQueue.then(() => saveChunk(transferId, chunkIndex, plaintext).catch(console.error));
        
        receivedCount++;
        onProgress?.(receivedCount, totalChunks);

        if (receivedCount >= meta.totalChunks) {
          clearTimeout(idleTimer);
          cleanup?.();
          
          // Ensure all trailing chunks are safely flushed to DB before finishing
          await idbQueue;
          
          // If no chunks are missing from memory, assemble instantly (bypassing IDB reads)
          if (!inMemoryChunks.includes(null)) {
            resolve(assembleChunks(inMemoryChunks as ArrayBuffer[]));
          } else {
            // Fallback for resumed transfers
            const storedChunks = await getAllChunksForTransfer(transferId);
            resolve(assembleChunks(storedChunks.map(c => c.data)));
          }
        }
      } catch (err) {
        clearTimeout(idleTimer);
        cleanup?.();
        reject(new Error(`[ChunkTransfer] Decryption failed on chunk: ${err}`));
      }
    });
  });
}

/**
 * Concatenate an ordered array of ArrayBuffers into a single contiguous buffer.
 */
function assembleChunks(chunks: ArrayBuffer[]): ArrayBuffer {
  const totalBytes = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const assembled = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    assembled.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return assembled.buffer;
}

/**
 * Trigger a browser file download from an ArrayBuffer.
 *
 * @param data     - The complete plaintext file data.
 * @param fileName - Original file name to use for the download.
 * @param mimeType - MIME type for the Blob.
 */
export function triggerDownload(
  data: ArrayBuffer,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Delay revocation to allow the download to initiate.
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
