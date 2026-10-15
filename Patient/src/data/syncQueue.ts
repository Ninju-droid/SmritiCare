import * as Crypto from "expo-crypto";
import type { SyncItem, SyncRecordType } from "./types";
import { getItem, setItem, storageKeys } from "./storage";

const MAX_BATCH_SIZE = 50;
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000] as const;

async function readQueue(): Promise<SyncItem[]> {
  const queue = await getItem<SyncItem[]>(storageKeys.syncQueue);

  if (queue === null) {
    return [];
  }

  if (!Array.isArray(queue)) {
    throw new Error("The saved sync queue is not a list.");
  }

  return queue;
}

export async function enqueue(
  type: SyncRecordType,
  payload: unknown,
): Promise<SyncItem> {
  const queue = await readQueue();
  const item: SyncItem = {
    id: Crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    synced: false,
    attempts: 0,
  };

  queue.push(item);
  await setItem(storageKeys.syncQueue, queue);

  return item;
}

export async function getPending(): Promise<SyncItem[]> {
  return (await readQueue()).filter((item) => !item.synced);
}

export async function markSynced(id: string): Promise<void> {
  const queue = await readQueue();
  const item = queue.find((entry) => entry.id === id);

  if (!item) {
    throw new Error(`Could not find sync queue item "${id}".`);
  }

  item.synced = true;
  await setItem(storageKeys.syncQueue, queue);
}

export function getRetryDelayMs(attempts: number): number {
  if (!Number.isInteger(attempts) || attempts < 0) {
    throw new RangeError("Sync attempts must be a non-negative integer.");
  }

  return RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length - 1)];
}

export async function pushPending(): Promise<void> {
  const batch = (await getPending()).slice(0, MAX_BATCH_SIZE);

  if (batch.length === 0) {
    return;
  }

  // TODO: POST this batch to /sync, retrying with 30s, 1m, then 2m delays (capped).
}
