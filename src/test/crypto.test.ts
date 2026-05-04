/**
 * Secure-Drop — CryptoService Unit Tests
 * Tests the complete cryptographic pipeline using vitest + Web Crypto API.
 *
 * Coverage:
 *   1. ECDH key pair generation
 *   2. Public key export/import round-trip
 *   3. Shared session key derivation (bidirectional agreement)
 *   4. AES-256-GCM encrypt→decrypt round-trip
 *   5. SHA-256 integrity verification (match + mismatch)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateSessionKeyPair,
  importPeerPublicKey,
  deriveSharedSessionKey,
  encryptChunk,
  decryptChunk,
  computeSha256,
  verifyFileIntegrity,
} from "@/engine/CryptoService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stringToBuffer(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer;
}

function bufferToString(b: ArrayBuffer): string {
  return new TextDecoder().decode(b);
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe("CryptoService — ECDH Key Management", () => {
  it("generates a valid P-256 key pair", async () => {
    const kp = await generateSessionKeyPair();
    expect(kp.privateKey).toBeDefined();
    expect(kp.publicKey).toBeDefined();
    expect(kp.publicKeyJwk).toBeDefined();
    expect(kp.publicKeyJwk.crv).toBe("P-256");
  });

  it("exports public key as JWK and re-imports it successfully", async () => {
    const kp = await generateSessionKeyPair();
    const imported = await importPeerPublicKey(kp.publicKeyJwk);
    expect(imported).toBeDefined();
    expect(imported.type).toBe("public");
    expect(imported.algorithm.name).toBe("ECDH");
  });
});

describe("CryptoService — Session Key Derivation", () => {
  it("derives matching AES-256-GCM keys on both sides (Diffie–Hellman agreement)", async () => {
    // Simulate Alice and Bob generating independent key pairs.
    const alice = await generateSessionKeyPair();
    const bob = await generateSessionKeyPair();

    // Alice imports Bob's public key and vice versa.
    const aliceImportsBob = await importPeerPublicKey(bob.publicKeyJwk);
    const bobImportsAlice = await importPeerPublicKey(alice.publicKeyJwk);

    // Both derive session keys using the same canonical session ID so HKDF
    // produces identical AES-256-GCM keys on both sides.
    const sharedSessionId = "test-session";
    const aliceKey = await deriveSharedSessionKey(alice.privateKey, aliceImportsBob, sharedSessionId);
    const bobKey   = await deriveSharedSessionKey(bob.privateKey,   bobImportsAlice, sharedSessionId);

    // Verify that both derived keys can encrypt/decrypt each other's data.
    const plaintext = stringToBuffer("Hello, Secure-Drop!");
    const { ciphertext, iv } = await encryptChunk(aliceKey.aesKey, plaintext);
    const decrypted = await decryptChunk(bobKey.aesKey, iv, ciphertext);

    expect(bufferToString(decrypted)).toBe("Hello, Secure-Drop!");
  });
});

describe("CryptoService — AES-256-GCM Encryption", () => {
  let sessionKey: CryptoKey;

  beforeAll(async () => {
    const alice = await generateSessionKeyPair();
    const bob = await generateSessionKeyPair();
    const aliceImportsBob = await importPeerPublicKey(bob.publicKeyJwk);
    const derived = await deriveSharedSessionKey(alice.privateKey, aliceImportsBob, "test-session");
    sessionKey = derived.aesKey;
  });

  it("produces ciphertext different from plaintext", async () => {
    const plaintext = stringToBuffer("Confidential data");
    const { ciphertext } = await encryptChunk(sessionKey, plaintext);
    expect(ciphertext.byteLength).toBeGreaterThan(plaintext.byteLength); // tag overhead
    expect(new Uint8Array(ciphertext)).not.toEqual(new Uint8Array(plaintext));
  });

  it("decrypts to the original plaintext", async () => {
    const original = "Binary protocol test — Secure-Drop v1.0";
    const { ciphertext, iv } = await encryptChunk(sessionKey, stringToBuffer(original));
    const decrypted = await decryptChunk(sessionKey, iv, ciphertext);
    expect(bufferToString(decrypted)).toBe(original);
  });

  it("uses a unique IV for each encryption call", async () => {
    const data = stringToBuffer("same plaintext");
    const { iv: iv1 } = await encryptChunk(sessionKey, data);
    const { iv: iv2 } = await encryptChunk(sessionKey, data);
    // Probability of collision with 96-bit random IV is astronomically low.
    expect(Array.from(iv1).join(",")).not.toBe(Array.from(iv2).join(","));
  });

  it("throws on tampered ciphertext (AEAD authentication failure)", async () => {
    const { ciphertext, iv } = await encryptChunk(sessionKey, stringToBuffer("important"));
    // Flip a byte in the ciphertext to simulate tampering.
    const tampered = ciphertext.slice(0);
    new Uint8Array(tampered)[0] ^= 0xff;
    await expect(decryptChunk(sessionKey, iv, tampered)).rejects.toThrow();
  });
});

describe("CryptoService — SHA-256 Integrity", () => {
  it("computes a 64-character hex digest", async () => {
    const hash = await computeSha256(stringToBuffer("test data"));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("returns true for matching hash", async () => {
    const data = stringToBuffer("secure drop integrity test");
    const hash = await computeSha256(data);
    const isValid = await verifyFileIntegrity(data, hash);
    expect(isValid).toBe(true);
  });

  it("returns false for mismatched hash", async () => {
    const data = stringToBuffer("original content");
    const tamperedData = stringToBuffer("modified content");
    const hash = await computeSha256(data);
    const isValid = await verifyFileIntegrity(tamperedData, hash);
    expect(isValid).toBe(false);
  });
});
