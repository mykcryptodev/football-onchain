import { describe, expect, mock, test } from "bun:test";

/**
 * In-memory stand-in for the Upstash client, covering only the operations
 * `pickem-image-status.ts` actually calls (`get`/`set` with `nx`, `del`,
 * `zadd`/`zrem`/`zrange` with `byScore`/`offset`/`count`). Shared across every
 * test in this file, so each test uses its own contest/token IDs to stay
 * isolated rather than resetting state between tests.
 */
class FakeRedis {
  private store = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private zsets = new Map<string, Map<string, number>>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, opts?: { nx?: boolean }) {
    if (opts?.nx && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }

  // Same as `set`, minus the (unused-by-this-file) TTL: this fake has no
  // expiry sweep, and nothing here asserts on TTL behavior.
  async setex(key: string, _ttlSeconds: number, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async del(...keys: string[]) {
    let removed = 0;
    for (const key of keys) if (this.store.delete(key)) removed++;
    return removed;
  }

  async sadd(key: string, ...members: string[]) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const s = this.sets.get(key)!;
    let added = 0;
    for (const m of members) {
      if (!s.has(m)) {
        s.add(m);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }

  async zadd(key: string, entry: { score: number; member: string }) {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    this.zsets.get(key)!.set(entry.member, entry.score);
    return 1;
  }

  async zrem(key: string, ...members: string[]) {
    const z = this.zsets.get(key);
    if (!z) return 0;
    let removed = 0;
    for (const m of members) if (z.delete(m)) removed++;
    return removed;
  }

  async zrange(
    key: string,
    min: number,
    max: number,
    opts?: { byScore?: boolean; offset?: number; count?: number },
  ) {
    const z = this.zsets.get(key);
    if (!z) return [];
    const entries = [...z.entries()]
      .filter(([, score]) => score >= min && score <= max)
      .sort((a, b) => a[1] - b[1]);
    const offset = opts?.offset ?? 0;
    const count = opts?.count ?? entries.length;
    return entries.slice(offset, offset + count).map(([m]) => m);
  }
}

const fakeRedis = new FakeRedis();
const blobDel = mock(async (_pathname: string) => {});

// `mock.module` replaces the module for the whole `bun test` process, not
// just this file — every other test file that imports `@/lib/redis` (even
// ones unrelated to this feature) sees this replacement too. Spread the real
// module's exports so cache-key helpers and constants (e.g. `CACHE_TTL`)
// stay available everywhere, and only override `redis`/`safeRedisOperation`.
const RealRedis = await import("@/lib/redis");
mock.module("@/lib/redis", () => ({
  ...RealRedis,
  redis: fakeRedis,
  safeRedisOperation: async (op: () => Promise<unknown>, fallback: unknown) => {
    try {
      return await op();
    } catch {
      return fallback;
    }
  },
}));
mock.module("@vercel/blob", () => ({ del: blobDel }));

const {
  claimDueRetries,
  claimExpiredRetention,
  claimImageJob,
  deleteImageRecord,
  getImageStatus,
  hasReachedMaxAttempts,
  backoffMs,
  imagePathname,
  markImageReady,
  PICKEM_IMAGE_MAX_ATTEMPTS,
  PICKEM_IMAGE_QUEUE_KEY,
  PICKEM_IMAGE_RETENTION_KEY,
  retentionExpiresAt,
  scheduleRetry,
} = await import("@/lib/pickem-image-status");

describe("backoff / max-attempts / retention math", () => {
  test("backoff grows then clamps at the longest step", () => {
    expect(backoffMs(0)).toBe(60_000);
    expect(backoffMs(1)).toBe(300_000);
    expect(backoffMs(4)).toBe(14_400_000);
    expect(backoffMs(99)).toBe(14_400_000);
  });

  test("max attempts is reached at exactly PICKEM_IMAGE_MAX_ATTEMPTS", () => {
    expect(hasReachedMaxAttempts(PICKEM_IMAGE_MAX_ATTEMPTS - 1)).toBe(false);
    expect(hasReachedMaxAttempts(PICKEM_IMAGE_MAX_ATTEMPTS)).toBe(true);
    expect(hasReachedMaxAttempts(PICKEM_IMAGE_MAX_ATTEMPTS + 1)).toBe(true);
  });

  test("retention defaults to 30 days when PICKEM_IMAGE_RETENTION_DAYS is unset", () => {
    expect(retentionExpiresAt(0)).toBe(30 * 86_400_000);
  });
});

describe("claim / ready / retry lifecycle", () => {
  test("claimImageJob lets only the first caller claim", async () => {
    const contestId = 1001n,
      tokenId = 1n;
    expect(await claimImageJob(contestId, tokenId)).toBe(true);
    expect(await claimImageJob(contestId, tokenId)).toBe(false);
  });

  test("markImageReady records the blob URL and attempt count", async () => {
    const contestId = 1002n,
      tokenId = 2n;
    await claimImageJob(contestId, tokenId);
    await markImageReady(contestId, tokenId, "https://blob.example/x.png", 2);
    const record = await getImageStatus(contestId, tokenId);
    expect(record).toEqual({
      status: "ready",
      attempts: 2,
      updatedAt: record!.updatedAt,
      blobUrl: "https://blob.example/x.png",
    });
  });

  test("scheduleRetry stays pending under the attempt limit, then fails permanently", async () => {
    const contestId = 1003n,
      tokenId = 3n;
    for (let attempts = 1; attempts < PICKEM_IMAGE_MAX_ATTEMPTS; attempts++) {
      expect(await scheduleRetry(contestId, tokenId, attempts, "boom")).toBe(
        "pending",
      );
    }
    const finalStatus = await scheduleRetry(
      contestId,
      tokenId,
      PICKEM_IMAGE_MAX_ATTEMPTS,
      "boom",
    );
    expect(finalStatus).toBe("failed");
    const record = await getImageStatus(contestId, tokenId);
    expect(record?.status).toBe("failed");
    expect(record?.error).toBe("boom");
  });
});

describe("cron sweeps", () => {
  test("claimDueRetries only returns and pops items due now", async () => {
    const past = Date.now() - 1_000;
    const future = Date.now() + 1_000_000;
    await fakeRedis.zadd(PICKEM_IMAGE_QUEUE_KEY, { score: past, member: "2001:1" });
    await fakeRedis.zadd(PICKEM_IMAGE_QUEUE_KEY, {
      score: future,
      member: "2001:2",
    });

    const due = await claimDueRetries(10);
    const members = due.map(item => `${item.contestId}:${item.tokenId}`);
    expect(members).toContain("2001:1");
    expect(members).not.toContain("2001:2");

    const dueAgain = await claimDueRetries(10);
    expect(
      dueAgain.map(item => `${item.contestId}:${item.tokenId}`),
    ).not.toContain("2001:1");
  });

  test("claimExpiredRetention only returns and pops expired items", async () => {
    const past = Date.now() - 1_000;
    const future = Date.now() + 1_000_000;
    await fakeRedis.zadd(PICKEM_IMAGE_RETENTION_KEY, {
      score: past,
      member: "2002:1",
    });
    await fakeRedis.zadd(PICKEM_IMAGE_RETENTION_KEY, {
      score: future,
      member: "2002:2",
    });

    const expired = await claimExpiredRetention(10);
    const members = expired.map(item => `${item.contestId}:${item.tokenId}`);
    expect(members).toContain("2002:1");
    expect(members).not.toContain("2002:2");
  });
});

describe("deleteImageRecord", () => {
  test("deletes the blob by its deterministic pathname and clears the status record", async () => {
    const contestId = 1004n,
      tokenId = 4n;
    await claimImageJob(contestId, tokenId);
    await markImageReady(contestId, tokenId, "https://blob.example/y.png", 1);

    await deleteImageRecord(contestId, tokenId);

    expect(blobDel).toHaveBeenCalledWith(imagePathname(contestId, tokenId));
    expect(await getImageStatus(contestId, tokenId)).toBeNull();
  });
});
