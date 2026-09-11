import { describe, expect, test } from "bun:test";

import { isContestSettled } from "./player-profile";

// Settled contests are cached with no expiry, so this must never say "settled"
// while any prize could still change.
describe("isContestSettled", () => {
  test("not settled while games are still being finalized", () => {
    expect(isContestSettled(false, [true, true])).toBe(false);
  });
  test("not settled while any entry is still unscored", () => {
    expect(isContestSettled(true, [true, false, true])).toBe(false);
  });
  test("settled once games are final and every entry is scored", () => {
    expect(isContestSettled(true, [true, true, true])).toBe(true);
  });
});
