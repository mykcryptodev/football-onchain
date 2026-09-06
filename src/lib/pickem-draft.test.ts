import { describe, expect, it } from "bun:test";

import { draftKey, hasDraftPicks, parseDraft } from "./pickem-draft";

describe("pick’em draft recovery", () => {
  const saved = {
    version: 1,
    picks: { a: 0, b: 1 },
    tiebreakerPoints: "42",
    updatedAt: 123,
  };
  it("restores both team choices and the tiebreaker after a reload", () => {
    const restored = parseDraft(JSON.stringify(saved), ["a", "b"]);
    expect(restored).toEqual(saved);
    expect(hasDraftPicks(restored)).toBe(true);
  });
  it("keeps drafts separate across wallets, contests, deployments, and chains", () => {
    const keys = [
      draftKey(1, "0xABC", 3),
      draftKey(1, "0xABC", 3, "0x111"),
      draftKey(1, "0xABC", 3, "0x222"),
      draftKey(1, "0xABC", 4, "0x111"),
      draftKey(2, "0xABC", 3, "0x111"),
      draftKey(1, "0xDEF", 3, "0x111"),
    ];
    expect(new Set(keys).size).toBe(keys.length);
    expect(draftKey(1, "0xABC", 3, "0xABC")).toBe(
      draftKey(1, "0xabc", 3, "0xabc"),
    );
  });
  it("drops removed games and leaves new games unpicked", () => {
    expect(parseDraft(JSON.stringify(saved), ["b", "c"])?.picks).toEqual({
      b: 1,
      c: -1,
    });
  });
  it("does not mistake malformed storage for a complete entry", () => {
    for (const raw of [
      null,
      "bad JSON",
      "null",
      "{}",
      JSON.stringify({ ...saved, version: 2 }),
    ])
      expect(parseDraft(raw, ["a"])).toBeNull();
    expect(
      parseDraft(JSON.stringify({ ...saved, picks: { a: "1", b: 9 } }), [
        "a",
        "b",
      ])?.picks,
    ).toEqual({ a: -1, b: -1 });
    expect(hasDraftPicks(null)).toBe(false);
  });
  it("retains a pending transaction on reload so it can be checked instead of resubmitted", () => {
    for (const kind of ["bundle", "transaction"]) {
      const pending = { kind, id: "0x123" };
      expect(
        parseDraft(JSON.stringify({ ...saved, pending }), ["a", "b"])?.pending,
      ).toEqual(pending);
    }
  });
});
