import { describe, expect, it } from "bun:test";

import { calculateEntryPrize } from "./pickem-prize";

describe("contract-aligned winnings", () => {
  it("uses the 2% fee and individual top-three payouts, not an equal split", () => {
    const prizes = [0, 1, 2].map(rank =>
      calculateEntryPrize(100_000_000n, 20n, 1000n, [600n, 300n, 100n], rank),
    );
    expect(prizes).toEqual([58_800_000n, 29_400_000n, 9_800_000n]);
  });
  it("preserves native-token precision", () => {
    expect(
      calculateEntryPrize(1_000_000_000_000_000_000n, 20n, 1000n, [1000n], 0),
    ).toBe(980_000_000_000_000_000n);
  });
  it("rounds in the same order as claimPrize for small pots", () => {
    expect(calculateEntryPrize(101n, 20n, 1000n, [600n, 300n, 100n], 0)).toBe(
      59n,
    );
  });
  it("does not offer winnings to entries outside the paid places", () => {
    expect(calculateEntryPrize(100n, 20n, 1000n, [1000n], -1)).toBe(0n);
    expect(calculateEntryPrize(100n, 20n, 1000n, [1000n], 1)).toBe(0n);
  });
});
