/**
 * Secure-Drop — File Integrity Verifier
 * =======================================
 * Provides post-transfer SHA-256 integrity verification.
 *
 * The sender computes SHA-256 of the plaintext file before encryption
 * and includes it in the FileMetadata. After the receiver reassembles
 * and decrypts all chunks, this module re-computes the SHA-256 and
 * compares it with the expected value from the metadata.
 *
 * This provides an independent integrity guarantee beyond AES-GCM's
 * per-chunk AEAD authentication — detecting corruption at the full-file level.
 */

import { computeSha256, verifyFileIntegrity } from "./CryptoService";

export type VerificationResult =
  | { status: "verified"; hash: string }
  | { status: "failed"; expected: string; actual: string }
  | { status: "error"; reason: string };

/**
 * Verify the integrity of a received file against its expected SHA-256 hash.
 *
 * @param data         - The fully assembled plaintext ArrayBuffer.
 * @param expectedHash - The hex SHA-256 hash from the FileMetadata.
 * @returns            - A typed VerificationResult.
 */
export async function verifyTransferIntegrity(
  data: ArrayBuffer,
  expectedHash: string,
): Promise<VerificationResult> {
  try {
    const actualHash = await computeSha256(data);
    const matches = actualHash === expectedHash.toLowerCase();

    if (matches) {
      return { status: "verified", hash: actualHash };
    } else {
      return {
        status: "failed",
        expected: expectedHash.toLowerCase(),
        actual: actualHash,
      };
    }
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Format a SHA-256 hex string for display: show first 8 and last 8 chars.
 * e.g. "a3f9d2c1…e8b47f20"
 */
export function formatHashShort(hash: string): string {
  if (hash.length < 16) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}
