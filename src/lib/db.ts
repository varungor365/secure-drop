import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { TransferSession } from "@/types/transfer";

interface SecureDropDB extends DBSchema {
  transfers: {
    key: string;
    value: TransferSession;
  };
  chunks: {
    key: string; // Composite key string: "transferId-chunkIndex"
    value: {
      transferId: string;
      chunkIndex: number;
      data: ArrayBuffer;
    };
    indexes: { "by-transfer": string };
  };
}

let dbPromise: Promise<IDBPDatabase<SecureDropDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SecureDropDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SecureDropDB>("securedrop_db", 1, {
      upgrade(db) {
        // Transfers store
        if (!db.objectStoreNames.contains("transfers")) {
          db.createObjectStore("transfers", { keyPath: "id" });
        }
        
        // Chunks store
        if (!db.objectStoreNames.contains("chunks")) {
          const chunkStore = db.createObjectStore("chunks", { autoIncrement: true });
          chunkStore.createIndex("by-transfer", "transferId");
        }
      },
    });
  }
  return dbPromise;
}

// ── transfers ──────────────────────────────────────────────────────────────

export async function getAllTransfers(): Promise<TransferSession[]> {
  const db = await getDB();
  return db.getAll("transfers");
}

export async function saveTransfer(transfer: TransferSession): Promise<void> {
  const db = await getDB();
  await db.put("transfers", transfer);
}

export async function deleteTransfer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("transfers", id);
}

// ── chunks ─────────────────────────────────────────────────────────────────

export async function saveChunk(transferId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const dbKey = `${transferId}-${chunkIndex}`;
  await db.put("chunks", { transferId, chunkIndex, data }, dbKey);
}

export async function getReceivedChunkIndices(transferId: string): Promise<Set<number>> {
  const db = await getDB();
  // Get all chunks for a transfer
  const keys = await db.getAllKeysFromIndex("chunks", "by-transfer", transferId);
  // Keys will be the primary keys. We can just getAll, but getAllKeys only gives primary keys.
  // Wait, our primary key is composite string, we could parse it, or we could just getAll the objects
  // `getAllKeysFromIndex` gives primary keys, so array of strings.
  const indices = keys.map(k => {
    // k is e.g. "uuid-123", we split and parse the end.
    const parts = (k as string).split("-");
    return parseInt(parts[parts.length - 1], 10);
  });
  return new Set(indices);
}

export async function getAllChunksForTransfer(transferId: string): Promise<{ chunkIndex: number; data: ArrayBuffer }[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex("chunks", "by-transfer", transferId);
  // Sort by chunkIndex for safe assembly
  return records.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export async function deleteChunksForTransfer(transferId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("chunks", "readwrite");
  const store = tx.objectStore("chunks");
  const index = store.index("by-transfer");
  
  let cursor = await index.openCursor(transferId);
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
