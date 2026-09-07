import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

/**
 * This route must never read the blockchain or ESPN — it should be able to
 * answer every case purely from the Redis status record. Failing `fetch`
 * hard proves that: viem's RPC client and ESPN's API both go over `fetch`
 * under the hood, so if a future change accidentally reintroduces a live
 * read, this mock makes it throw instead of silently reaching the network.
 */
const originalFetch = global.fetch;

let statusRecord: unknown = null;
mock.module("@/lib/pickem-image-status", () => ({
  getImageStatus: async () => statusRecord,
}));

const { GET } = await import("./route");

function request(url: string) {
  return new NextRequest(url);
}

beforeEach(() => {
  statusRecord = null;
  global.fetch = mock(() => {
    throw new Error("no live network reads allowed in this route");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("GET /api/og/pickem/[contestId]/picks", () => {
  test("redirects to the persisted blob URL when ready", async () => {
    statusRecord = {
      status: "ready",
      attempts: 1,
      updatedAt: Date.now(),
      blobUrl: "https://blob.example/pickem/1/2.png",
    };
    const res = await GET(
      request("https://app.example/api/og/pickem/1/picks?tokenId=2"),
      { params: Promise.resolve({ contestId: "1" }) },
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://blob.example/pickem/1/2.png",
    );
  });

  test("returns 404 when the render permanently failed", async () => {
    statusRecord = {
      status: "failed",
      attempts: 5,
      updatedAt: Date.now(),
      error: "boom",
    };
    const res = await GET(
      request("https://app.example/api/og/pickem/1/picks?tokenId=2"),
      { params: Promise.resolve({ contestId: "1" }) },
    );
    expect(res.status).toBe(404);
  });

  test("returns 503 with Retry-After while pending", async () => {
    statusRecord = { status: "pending", attempts: 0, updatedAt: Date.now() };
    const res = await GET(
      request("https://app.example/api/og/pickem/1/picks?tokenId=2"),
      { params: Promise.resolve({ contestId: "1" }) },
    );
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("5");
  });

  test("returns 404 for an invalid tokenId without ever touching the network", async () => {
    const res = await GET(
      request("https://app.example/api/og/pickem/1/picks"),
      { params: Promise.resolve({ contestId: "1" }) },
    );
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
