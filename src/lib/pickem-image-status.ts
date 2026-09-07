/**
 * Redis-backed status/queue/retention bookkeeping for pre-generated,
 * entry-specific Pick'em share images. No blockchain or ESPN reads happen
 * here — only Redis reads/writes and (for cleanup) a Vercel Blob delete by
 * deterministic pathname. This keeps the image GET route and the readiness
 * checks it powers completely free of live data dependencies.
 *
 * A status record doubles as its own render lock: claiming a job is a single
 * `SET ... NX` on the status key, so two concurrent viewers (e.g. a Bankr
 * poll and a website page render) can't both kick off a render.
 */
import { del } from "@vercel/blob";

import { redis, safeRedisOperation } from "@/lib/redis";

export type PickemImageStatus = "pending" | "ready" | "failed";

export interface PickemImageRecord {
  status: PickemImageStatus;
  attempts: number;
  updatedAt: number;
  blobUrl?: string;
  error?: string;
}

const MAX_ATTEMPTS = 5;
// 1m, 5m, 15m, 1h, 4h — matches the cron's 2-minute sweep cadence closely
// enough on the early retries to feel instant, then backs off.
const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];
const RETENTION_MS =
  Number(process.env.PICKEM_IMAGE_RETENTION_DAYS || "30") * 86_400_000;
export const PICKEM_IMAGE_QUEUE_KEY = "pickem:image:queue";
export const PICKEM_IMAGE_RETENTION_KEY = "pickem:image:retention";
const QUEUE_KEY = PICKEM_IMAGE_QUEUE_KEY;
const RETENTION_KEY = PICKEM_IMAGE_RETENTION_KEY;

/** Backoff before the next retry, clamped to the last (longest) step. */
export function backoffMs(attempts: number): number {
  return BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

/** Whether a job should stop retrying and be marked permanently `failed`. */
export function hasReachedMaxAttempts(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

/** Absolute time a record becomes eligible for retention cleanup. */
export function retentionExpiresAt(now: number): number {
  return now + RETENTION_MS;
}

function member(contestId: bigint, tokenId: bigint): string {
  return `${contestId}:${tokenId}`;
}

export function imagePathname(contestId: bigint, tokenId: bigint): string {
  return `pickem/${contestId}/${tokenId}.png`;
}

function statusKey(contestId: bigint, tokenId: bigint): string {
  return `pickem:image:status:${member(contestId, tokenId)}`;
}

function parseRecord(raw: unknown): PickemImageRecord | null {
  if (!raw) return null;
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || !("status" in value))
    return null;
  return value as PickemImageRecord;
}

export async function getImageStatus(
  contestId: bigint,
  tokenId: bigint,
): Promise<PickemImageRecord | null> {
  if (!redis) return null;
  const raw = await safeRedisOperation(
    () => redis!.get(statusKey(contestId, tokenId)),
    null,
  );
  return parseRecord(raw);
}

// How long a freshly-claimed render gets before it's treated as abandoned
// (process killed before `after()` ran, etc.) and picked up as a retry by
// the cron instead of being stuck "pending" forever with no one watching it.
const CLAIM_WATCHDOG_MS = 5 * 60_000;

/**
 * Atomically claims the render job for a not-yet-tracked entry. Returns
 * `true` only for the caller that should actually perform the render; every
 * other concurrent caller gets `false` and should just report "pending".
 *
 * The claim also seeds the retry queue with a watchdog entry, so a claim
 * that never completes (the in-flight render dies before recording success
 * or failure) still surfaces to the cron sweep instead of being stuck
 * `pending` with no record in either the queue or the retention index.
 * `markImageReady`/`scheduleRetry` both overwrite this entry on completion.
 */
export async function claimImageJob(
  contestId: bigint,
  tokenId: bigint,
): Promise<boolean> {
  if (!redis) return false;
  const record: PickemImageRecord = {
    status: "pending",
    attempts: 0,
    updatedAt: Date.now(),
  };
  const claimed = await safeRedisOperation(
    () =>
      redis!.set(statusKey(contestId, tokenId), JSON.stringify(record), {
        nx: true,
      }),
    null,
  );
  if (claimed !== "OK") return false;
  await safeRedisOperation(
    () =>
      redis!.zadd(QUEUE_KEY, {
        score: Date.now() + CLAIM_WATCHDOG_MS,
        member: member(contestId, tokenId),
      }),
    null,
  );
  return true;
}

export async function markImageReady(
  contestId: bigint,
  tokenId: bigint,
  blobUrl: string,
  attempts: number,
): Promise<void> {
  const record: PickemImageRecord = {
    status: "ready",
    attempts,
    updatedAt: Date.now(),
    blobUrl,
  };
  await safeRedisOperation(async () => {
    await redis!.set(statusKey(contestId, tokenId), JSON.stringify(record));
    await redis!.zrem(QUEUE_KEY, member(contestId, tokenId));
    await redis!.zadd(RETENTION_KEY, {
      score: retentionExpiresAt(Date.now()),
      member: member(contestId, tokenId),
    });
  }, null);
}

/**
 * Records a failed render attempt. Reschedules with backoff while attempts
 * remain, otherwise marks the job permanently `failed` (still retention-
 * cleaned like any other terminal record).
 */
export async function scheduleRetry(
  contestId: bigint,
  tokenId: bigint,
  attempts: number,
  error: string,
): Promise<PickemImageStatus> {
  const status: PickemImageStatus = hasReachedMaxAttempts(attempts)
    ? "failed"
    : "pending";
  const record: PickemImageRecord = {
    status,
    attempts,
    updatedAt: Date.now(),
    error,
  };
  await safeRedisOperation(async () => {
    await redis!.set(statusKey(contestId, tokenId), JSON.stringify(record));
    if (status === "failed") {
      await redis!.zrem(QUEUE_KEY, member(contestId, tokenId));
      await redis!.zadd(RETENTION_KEY, {
        score: retentionExpiresAt(Date.now()),
        member: member(contestId, tokenId),
      });
    } else {
      await redis!.zadd(QUEUE_KEY, {
        score: Date.now() + backoffMs(attempts),
        member: member(contestId, tokenId),
      });
    }
  }, null);
  return status;
}

export interface QueueItem {
  contestId: bigint;
  tokenId: bigint;
}

function parseMember(raw: string): QueueItem {
  const [contestId, tokenId] = raw.split(":");
  return { contestId: BigInt(contestId), tokenId: BigInt(tokenId) };
}

/** Retry-due items, oldest-due first, removed from the queue before return. */
export async function claimDueRetries(limit: number): Promise<QueueItem[]> {
  if (!redis) return [];
  const due = await safeRedisOperation(
    () =>
      redis!.zrange<string[]>(QUEUE_KEY, 0, Date.now(), {
        byScore: true,
        offset: 0,
        count: limit,
      }),
    [],
  );
  if (!due?.length) return [];
  await safeRedisOperation(() => redis!.zrem(QUEUE_KEY, ...due), null);
  return due.map(parseMember);
}

/** Retention-expired items, removed from the retention index before return. */
export async function claimExpiredRetention(
  limit: number,
): Promise<QueueItem[]> {
  if (!redis) return [];
  const expired = await safeRedisOperation(
    () =>
      redis!.zrange<string[]>(RETENTION_KEY, 0, Date.now(), {
        byScore: true,
        offset: 0,
        count: limit,
      }),
    [],
  );
  if (!expired?.length) return [];
  await safeRedisOperation(() => redis!.zrem(RETENTION_KEY, ...expired), null);
  return expired.map(parseMember);
}

/** Deletes the persisted blob (if any) and the status record for one entry. */
export async function deleteImageRecord(
  contestId: bigint,
  tokenId: bigint,
): Promise<void> {
  await del(imagePathname(contestId, tokenId)).catch(() => {
    // Already gone, or never rendered (a permanently-failed job) — fine.
  });
  await safeRedisOperation(
    () => redis!.del(statusKey(contestId, tokenId)),
    null,
  );
}

export const PICKEM_IMAGE_MAX_ATTEMPTS = MAX_ATTEMPTS;
