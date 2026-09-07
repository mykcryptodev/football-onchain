import { describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

/**
 * Covers only the single-entry `GET .../entries?tokenId=` branch: proves the
 * response's `entries[0].share` gains a `status` field sourced from
 * `ensureEntryImage`, without touching the real `entries()`/`entryShare()`
 * implementation in `src/lib/bankr/service.ts` (that function and its exact
 * `share` shape are covered separately by `service.test.ts` and must stay
 * untouched).
 */
const jsonSafe = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

const readContract = mock(async () => [10n]);
const share = {
  text: "I'm in!",
  imageUrl: "https://app.example/api/og/pickem/1/picks?tokenId=10",
  imageAlt: "Picks image",
  markdown: "![picks](https://app.example/img.png)",
  fallbackText: "fallback",
};

mock.module("@/lib/bankr/service", () => ({
  address: "0x0000000000000000000000000000000000000001",
  browse: async () => ({}),
  contest: async (id: bigint) => ({
    id,
    weekNumber: 1,
    seasonType: 2,
    year: 2026n,
    gameIds: ["g1"],
  }),
  details: async () => ({}),
  entries: async (_c: unknown, ids: bigint[]) =>
    ids.map(tokenId => ({
      tokenId,
      predictor: "0xabc",
      owner: "0xabc",
      submissionTime: 0n,
      tiebreakerPoints: 10n,
      correctPicks: 0n,
      scoreCalculated: false,
      claimed: false,
      picks: [1],
      url: "https://app.example/pickem/1/entries/10",
      share,
    })),
  entryPage: async () => ({}),
  jsonSafe,
  leaderboard: async () => ({}),
  matchups: async () => [
    { gameId: "g1", home: "NE", away: "NYJ", completed: false },
  ],
  parsePicks: () => ({}),
  prepareEntry: async () => ({}),
  rpc: { readContract },
  settlement: async () => ({}),
  uint: (v: string) => BigInt(v),
  wallet: (v: string) => v,
}));

const ensureEntryImage = mock(async () => ({
  status: "pending",
  attempts: 0,
  updatedAt: Date.now(),
}));
mock.module("@/lib/pickem-image", () => ({ ensureEntryImage }));

const { GET } = await import("./route");

describe("GET /api/bankr/contests/{id}/entries?tokenId=", () => {
  test("merges the image render status into the entry's share object", async () => {
    const req = new NextRequest(
      "https://app.example/api/bankr/contests/1/entries?tokenId=10",
    );
    const res = await GET(req, {
      params: Promise.resolve({ path: ["contests", "1", "entries"] }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].share).toEqual({ ...share, status: "pending" });
    // The original share fields are untouched — only `status` is additive.
    expect(body.entries[0].share.imageUrl).toBe(share.imageUrl);
    expect(ensureEntryImage).toHaveBeenCalledWith(1n, 10n, expect.anything());
  });
});
