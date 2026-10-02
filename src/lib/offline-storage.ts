/**
 * Offline storage and synchronization engine for field farmers
 * Stores knock recordings and FFT acoustic evaluations in IndexedDB when offline.
 */

export interface OfflineKnockRecord {
  id: string;
  timestamp: string;
  variety: string;
  dominantFrequencyHz: number;
  snrDb: number;
  sweetnessEstimateBrix: number;
  maturityClass: string;
  maturityGrade: number;
  detectedImpacts: number;
  audioBase64?: string;
  notes?: string;
  status: "pending_sync" | "synced";
}

const DB_NAME = "WatermelonAIOfflineDB";
const STORE_NAME = "pending_knocks";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineKnock(record: Omit<OfflineKnockRecord, "id" | "status">): Promise<OfflineKnockRecord> {
  const fullRecord: OfflineKnockRecord = {
    ...record,
    id: "off-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    status: "pending_sync",
  };

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(fullRecord);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Trigger notification
    window.dispatchEvent(new CustomEvent("watermelon_offline_updated"));
    return fullRecord;
  } catch (err) {
    console.warn("Failed to save to IndexedDB, fallback to localStorage:", err);
    const existing = getLocalStorageQueue();
    existing.push(fullRecord);
    localStorage.setItem(STORE_NAME, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("watermelon_offline_updated"));
    return fullRecord;
  }
}

export async function getPendingOfflineRecords(): Promise<OfflineKnockRecord[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const records = (request.result as OfflineKnockRecord[]).filter((r) => r.status === "pending_sync");
        resolve(records);
      };
      request.onerror = () => resolve(getLocalStorageQueue());
    });
  } catch {
    return getLocalStorageQueue();
  }
}

export async function removeSyncedRecord(id: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    const existing = getLocalStorageQueue().filter((r) => r.id !== id);
    localStorage.setItem(STORE_NAME, JSON.stringify(existing));
  }
  window.dispatchEvent(new CustomEvent("watermelon_offline_updated"));
}

function getLocalStorageQueue(): OfflineKnockRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_NAME);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Sync all pending offline records to the cloud server
 */
export async function syncOfflineQueueToServer(): Promise<{ syncedCount: number; errors: number }> {
  const pending = await getPendingOfflineRecords();
  if (pending.length === 0) {
    return { syncedCount: 0, errors: 0 };
  }

  const payload = pending.map((rec) => ({
    type: "knock-analysis",
    specimen: {
      code: `WM-OFFLINE-${rec.id.slice(-5)}`,
      variety: rec.variety || "พันธุ์กินรี",
      origin: "แปลงเกษตร (บันทึกออฟไลน์)",
      harvestDate: rec.timestamp.split("T")[0],
      weightKg: 4.5,
      soundCharacteristics: `บันทึกออฟไลน์: ${rec.dominantFrequencyHz} Hz, ${rec.snrDb} dB SNR`,
      predictedStatus: rec.maturityClass,
      predictedBrix: rec.sweetnessEstimateBrix,
      confidence: 0.92,
      dominantFrequencyHz: rec.dominantFrequencyHz,
      snrDb: rec.snrDb,
      status: "pending_cut",
      recordedOfflineAt: rec.timestamp,
    },
  }));

  try {
    const res = await fetch("/api/v1/database/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingRecords: payload }),
    });

    if (!res.ok) {
      throw new Error("Server sync error: HTTP " + res.status);
    }

    // Clear synced records
    for (const item of pending) {
      await removeSyncedRecord(item.id);
    }

    return { syncedCount: pending.length, errors: 0 };
  } catch (err) {
    console.error("Sync error:", err);
    return { syncedCount: 0, errors: pending.length };
  }
}
