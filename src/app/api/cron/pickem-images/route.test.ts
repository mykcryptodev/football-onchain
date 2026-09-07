import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

let dueQueue: { contestId: bigint; tokenId: bigint }[] = [];
let expiredQueue: { contestId: bigint; tokenId: bigint }[] = [];
let attemptsByEntry = new Map<string, number>();

const renderAndStoreFromScratch = mock(
  async (_contestId: bigint, _tokenId: bigint, _priorAttempts: number) => {},
);
const deleteImageRecord = mock(async (_contestId: bigint, _tokenId: bigint) => {});

mock.module("@/lib/pickem-image-render", () => ({ renderAndStoreFromScratch }));
mock.module("@/lib/pickem-image-status", () => ({
  claimDueRetries: async () => dueQueue,
  claimExpiredRetention: async () => expiredQueue,
  deleteImageRecord,
  getImageStatus: async (contestId: bigint, tokenId: bigint) => {
    const attempts = attemptsByEntry.get(`${contestId}:${tokenId}`);
    return attempts === undefined ? null : { status: "pending", attempts, updatedAt: Date.now() };
  },
}));

const { GET } = await import("./route");

function request(headers?: Record<string, string>) {
  return new NextRequest("https://app.example/api/cron/pickem-images", {
    headers,
  });
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  dueQueue = [];
  expiredQueue = [];
  attemptsByEntry = new Map();
  renderAndStoreFromScratch.mockClear();
  deleteImageRecord.mockClear();
});

afterEach(() => {
  process.env.CRON_SECRET = originalSecret;
});

describe("GET /api/cron/pickem-images", () => {
  test("rejects requests without the correct bearer secret", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(renderAndStoreFromScratch).not.toHaveBeenCalled();
  });

  test("re-renders every due retry with its prior attempt count", async () => {
    dueQueue = [
      { contestId: 1n, tokenId: 10n },
      { contestId: 1n, tokenId: 11n },
    ];
    attemptsByEntry.set("1:10", 2);
    attemptsByEntry.set("1:11", 4);

    const res = await GET(
      request({ authorization: "Bearer test-secret" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ retried: 2, expired: 0 });
    expect(renderAndStoreFromScratch).toHaveBeenCalledTimes(2);
    expect(renderAndStoreFromScratch).toHaveBeenCalledWith(1n, 10n, 2);
    expect(renderAndStoreFromScratch).toHaveBeenCalledWith(1n, 11n, 4);
  });

  test("deletes every retention-expired record", async () => {
    expiredQueue = [
      { contestId: 2n, tokenId: 20n },
      { contestId: 2n, tokenId: 21n },
    ];

    const res = await GET(
      request({ authorization: "Bearer test-secret" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ retried: 0, expired: 2 });
    expect(deleteImageRecord).toHaveBeenCalledTimes(2);
    expect(deleteImageRecord).toHaveBeenCalledWith(2n, 20n);
    expect(deleteImageRecord).toHaveBeenCalledWith(2n, 21n);
  });
});
