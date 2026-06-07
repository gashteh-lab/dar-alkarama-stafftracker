// lib/offline/indexeddb.ts
// StaffTrack — IndexedDB manager for offline punch queue

import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { OfflinePunchRecord, DeviceInfo } from "@/types";

// ─────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────

interface StaffTrackDB extends DBSchema {
  "punch-queue": {
    key: string;
    value: OfflinePunchRecord;
    indexes: {
      "isSynced":  string;
      "staffId":   string;
      "timestamp": string;
    };
  };
  "app-state": {
    key: string;
    value: {
      key:       string;
      value:     unknown;
      updatedAt: string;
    };
  };
}

const DB_NAME    = "stafftrack-offline";
const DB_VERSION = 1;

// ─────────────────────────────────────────
// DB INITIALIZATION
// ─────────────────────────────────────────

let dbInstance: IDBPDatabase<StaffTrackDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<StaffTrackDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<StaffTrackDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Punch queue store
      if (!db.objectStoreNames.contains("punch-queue")) {
        const punchStore = db.createObjectStore("punch-queue", { keyPath: "id" });
        punchStore.createIndex("isSynced",  "isSynced");
        punchStore.createIndex("staffId",   "staffId");
        punchStore.createIndex("timestamp", "timestamp");
      }

      // App state store (for caching today's status, shift info, etc.)
      if (!db.objectStoreNames.contains("app-state")) {
        db.createObjectStore("app-state", { keyPath: "key" });
      }
    },
  });

  return dbInstance;
}

// ─────────────────────────────────────────
// PUNCH QUEUE OPERATIONS
// ─────────────────────────────────────────

export async function queueOfflinePunch(params: {
  staffId:    string;
  type:       "PUNCH_IN" | "PUNCH_OUT";
  timestamp:  string;
  latitude?:  number;
  longitude?: number;
  accuracy?:  number;
  deviceInfo?: DeviceInfo;
}): Promise<OfflinePunchRecord> {
  const db = await getDB();

  const record: OfflinePunchRecord = {
    id:         crypto.randomUUID(),
    staffId:    params.staffId,
    type:       params.type,
    timestamp:  params.timestamp,
    latitude:   params.latitude,
    longitude:  params.longitude,
    accuracy:   params.accuracy,
    deviceInfo: params.deviceInfo,
    isSynced:   false,
    createdAt:  new Date().toISOString(),
  };

  await db.put("punch-queue", record);

  // Register background sync
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register("stafftrack-punch-sync");
    } catch (err) {
      console.warn("[Offline] Background sync registration failed:", err);
    }
  }

  return record;
}

export async function getPendingPunches(staffId?: string): Promise<OfflinePunchRecord[]> {
  const db = await getDB();

  if (staffId) {
    const all = await db.getAllFromIndex("punch-queue", "staffId", staffId);
    return all.filter((r) => !r.isSynced);
  }

  return db.getAllFromIndex("punch-queue", "isSynced", false as any);
}

export async function getAllPendingPunches(): Promise<OfflinePunchRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("punch-queue", "isSynced", false as any);
}

export async function markPunchSynced(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get("punch-queue", id);
  if (record) {
    record.isSynced = true;
    await db.put("punch-queue", record);
  }
}

export async function markMultipleSynced(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("punch-queue", "readwrite");
  await Promise.all(
    ids.map(async (id) => {
      const record = await tx.store.get(id);
      if (record) {
        record.isSynced = true;
        tx.store.put(record);
      }
    })
  );
  await tx.done;
}

export async function getOfflinePunchCount(staffId: string): Promise<number> {
  const pending = await getPendingPunches(staffId);
  return pending.length;
}

export async function clearSyncedPunches(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("punch-queue", "readwrite");
  let cursor = await tx.store.openCursor();

  while (cursor) {
    if (cursor.value.isSynced) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }

  await tx.done;
}

// ─────────────────────────────────────────
// APP STATE CACHE
// ─────────────────────────────────────────

export async function setCachedState(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("app-state", {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCachedState<T>(key: string): Promise<T | null> {
  try {
    const db   = await getDB();
    const item = await db.get("app-state", key);
    return item ? (item.value as T) : null;
  } catch {
    return null;
  }
}

export async function clearCachedState(key: string): Promise<void> {
  const db = await getDB();
  await db.delete("app-state", key);
}

// ─────────────────────────────────────────
// SYNC ENGINE (called from app)
// ─────────────────────────────────────────

export async function syncOfflinePunches(onProgress?: (synced: number, total: number) => void): Promise<{
  synced:  number;
  failed:  number;
  errors:  string[];
}> {
  const pending = await getAllPendingPunches();

  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  console.log(`[Sync] Processing ${pending.length} offline punches...`);

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);

    try {
      const response = await fetch("/api/attendance/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          records: batch.map((r) => ({
            id:         r.id,
            type:       r.type,
            timestamp:  r.timestamp,
            latitude:   r.latitude,
            longitude:  r.longitude,
            accuracy:   r.accuracy,
            deviceInfo: r.deviceInfo,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const syncedIds = result.data?.syncedIds || batch.map((r) => r.id);
        await markMultipleSynced(syncedIds);
        synced += syncedIds.length;
        failed += batch.length - syncedIds.length;
      } else {
        failed += batch.length;
        errors.push(`Batch ${i / batchSize + 1} failed: HTTP ${response.status}`);
      }
    } catch (err) {
      failed += batch.length;
      errors.push(`Batch ${i / batchSize + 1} network error`);
    }

    onProgress?.(synced, pending.length);
  }

  // Clean up old synced records
  await clearSyncedPunches();

  return { synced, failed, errors };
}
