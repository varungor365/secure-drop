/**
 * Secure-Drop — Cryptographic Service
 * =====================================
 * Implements all cryptographic operations using the browser's native
 * Web Crypto API (SubtleCrypto). Zero third-party crypto dependencies.
 *
 * Cryptographic Protocol:
 *   1. Key Generation  — ECDH P-256 key pair (NIST FIPS 186-4)
 *   2. Key Exchange    — ECDH shared secret derivation
 *   3. Key Derivation  — HKDF-SHA-256 → AES-256-GCM key
 *   4. Encryption      — AES-256-GCM per chunk with unique 96-bit IV
 *   5. Decryption      — AES-256-GCM decryption + AEAD tag verification
 *   6. Integrity       — SHA-256 hash of complete plaintext file
 *
 * Security properties:
 *   - Forward secrecy: ephemeral keys, non-exportable private key
 *   - AEAD: GCM mode provides both confidentiality and authenticity
 *   - Unique IVs: cryptographically random 96-bit nonce per chunk
 */

import { GCM_IV_LENGTH, GCM_TAG_BITS, ECDH_CURVE } from "@/lib/constants";
import type { SessionKeyPair, DerivedSessionKey } from "@/types/transfer";

const subtle = globalThis.crypto.subtle;

// ── Key Generation ─────────────────────────────────────────────────────────

/**
 * Generate an ephemeral ECDH P-256 key pair for this session.
 * The private key is marked non-exportable — it never leaves the JS heap.
 */
export async function generateSessionKeyPair(): Promise<SessionKeyPair> {
  const keyPair = await subtle.generateKey(
    { name: "ECDH", namedCurve: ECDH_CURVE },
    false, // private key is non-extractable
    ["deriveKey", "deriveBits"],
  );

  // Export only the public key for transmission over signaling channel.
  const publicKeyJwk = await subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyJwk,
  };
}

/**
 * Import a peer's public key from its JWK representation received over
 * the signaling channel.
 */
export async function importPeerPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: ECDH_CURVE },
    true,
    [], // public key has no key usages in ECDH
  );
}

// ── Key Derivation ─────────────────────────────────────────────────────────

/**
 * Derive a symmetric AES-256-GCM key from an ECDH shared secret using HKDF.
 *
 * Steps:
 *   1. ECDH: myPrivKey + theirPubKey → shared secret (raw bits)
 *   2. HKDF-SHA-256: shared secret → 256-bit AES-GCM key
 *
 * @param myPrivateKey  - This peer's ECDH private key
 * @param theirPublicKey - Remote peer's ECDH public key (imported)
 * @param peerId        - Remote peer's ID (used as HKDF info for domain separation)
 */
export async function deriveSharedSessionKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
  peerId: string,
): Promise<DerivedSessionKey> {
  // Step 1: ECDH derivation → raw shared bits
  const sharedBits = await subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256,
  );

  // Step 2: Derive session fingerprint from shared bits (before HKDF key stretching).
  // Both peers independently compute the same fingerprint — if they match, no MITM.
  const fpHash = await subtle.digest("SHA-256", sharedBits);
  const fpBytes = Array.from(new Uint8Array(fpHash)).slice(0, 4);
  const fpHex = fpBytes.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const fingerprint = `${fpHex.slice(0, 4)}\u00b7${fpHex.slice(4)}`; // e.g. "A3F2·9C41"

  // Step 3: Import raw bits as HKDF key material
  const hkdfKey = await subtle.importKey(
    "raw",
    sharedBits,
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );

  // Step 4: Derive final AES-256-GCM key via HKDF-SHA-256
  const encoder = new TextEncoder();
  const aesKey = await subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("secure-drop-v1"), // protocol-level salt
      info: encoder.encode(`session-key:${peerId}`), // context binding
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false, // derived key is also non-extractable
    ["encrypt", "decrypt"],
  );

  return { aesKey, peerId, fingerprint };
}

// ── Encryption / Decryption ────────────────────────────────────────────────

/**
 * Encrypt a plaintext chunk using AES-256-GCM.
 *
 * @returns Object containing the ciphertext (with embedded 128-bit auth tag)
 *          and the randomly generated 96-bit IV used for this chunk.
 */
export async function encryptChunk(
  key: CryptoKey,
  plaintext: ArrayBuffer,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = new Uint8Array(GCM_IV_LENGTH);
  globalThis.crypto.getRandomValues(iv);

  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: GCM_TAG_BITS },
    key,
    plaintext,
  );

  return { ciphertext, iv };
}

/**
 * Decrypt an AES-256-GCM ciphertext chunk.
 * GCM mode automatically verifies the authentication tag.
 * Throws DOMException if the tag verification fails (tampered data).
 */
export async function decryptChunk(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer,
): Promise<ArrayBuffer> {
  return subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer>, tagLength: GCM_TAG_BITS },
    key,
    ciphertext,
  );
}

// ── Integrity Verification ─────────────────────────────────────────────────

/**
 * Compute SHA-256 digest of a complete file's ArrayBuffer.
 * Returns the hash as a lowercase hex string (64 characters).
 */
export async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify that a received file's SHA-256 matches the expected hash
 * transmitted in the FileMetadata during the transfer handshake.
 */
export async function verifyFileIntegrity(
  data: ArrayBuffer,
  expectedSha256: string,
): Promise<boolean> {
  const actualHash = await computeSha256(data);
  return actualHash === expectedSha256.toLowerCase();
}
