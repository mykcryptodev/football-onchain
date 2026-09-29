import { describe, expect, test } from "bun:test";

import { findPreviousWeekContest } from "../src/lib/pickem-previous-week";

const BANKRBALL = "0xA473533c54D105C6334fE06c8624f7dfbb09ba25";
const OTHER = "0x1111111111111111111111111111111111111111";

const contest = (
  id,
  weekNumber,
  creator = BANKRBALL,
  seasonType = 2,
  year = 2026,
) => ({ id, creator, year, seasonType, weekNumber });

describe("findPreviousWeekContest", () => {
  test("returns the same creator's contest from the prior week", () => {
    const current = contest(22, 4);
    const found = findPreviousWeekContest(current, [
      contest(21, 3),
      contest(20, 3, OTHER),
      contest(19, 2),
    ]);
    expect(found?.id).toBe(21);
  });

  test("matches creator case-insensitively", () => {
    const found = findPreviousWeekContest(contest(22, 4), [
      contest(18, 3, BANKRBALL.toLowerCase()),
    ]);
    expect(found?.id).toBe(18);
  });

  test("ignores other creators and same or later weeks", () => {
    const found = findPreviousWeekContest(contest(22, 4), [
      contest(21, 3, OTHER),
      contest(20, 4),
      contest(23, 5),
    ]);
    expect(found).toBeNull();
  });

  test("skips a missing week to the most recent earlier one", () => {
    const found = findPreviousWeekContest(contest(22, 4), [
      contest(15, 1),
      contest(19, 2),
    ]);
    expect(found?.id).toBe(19);
  });

  test("crosses season types and years", () => {
    expect(
      findPreviousWeekContest(contest(30, 1, BANKRBALL, 2), [
        contest(29, 3, BANKRBALL, 1),
      ])?.id,
    ).toBe(29);
    expect(
      findPreviousWeekContest(contest(40, 1, BANKRBALL, 2, 2027), [
        contest(39, 5, BANKRBALL, 3, 2026),
      ])?.id,
    ).toBe(39);
  });

  test("prefers the highest id when a week has several", () => {
    const found = findPreviousWeekContest(contest(22, 4), [
      contest(17, 3),
      contest(21, 3),
    ]);
    expect(found?.id).toBe(21);
  });
});
