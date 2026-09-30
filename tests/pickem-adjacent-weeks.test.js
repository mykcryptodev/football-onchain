import { describe, expect, test } from "bun:test";

import { findAdjacentWeekContests } from "../src/lib/pickem-adjacent-weeks";

const BANKRBALL = "0xA473533c54D105C6334fE06c8624f7dfbb09ba25";
const OTHER = "0x1111111111111111111111111111111111111111";
const ZERO = "0x0000000000000000000000000000000000000000";

const contest = (
  id,
  weekNumber,
  creator = BANKRBALL,
  seasonType = 2,
  year = 2026,
) => ({ id, creator, year, seasonType, weekNumber });

describe("findAdjacentWeekContests", () => {
  test("returns the same creator's prior and next week contests", () => {
    const { previous, next } = findAdjacentWeekContests(contest(22, 4), [
      contest(21, 3),
      contest(20, 3, OTHER),
      contest(19, 2),
      contest(23, 5, OTHER),
      contest(24, 5),
      contest(25, 6),
    ]);
    expect(previous?.id).toBe(21);
    expect(next?.id).toBe(24);
  });

  test("matches creator case-insensitively", () => {
    const { previous } = findAdjacentWeekContests(contest(22, 4), [
      contest(18, 3, BANKRBALL.toLowerCase()),
    ]);
    expect(previous?.id).toBe(18);
  });

  test("returns nulls without matching contests", () => {
    expect(
      findAdjacentWeekContests(contest(22, 4), [
        contest(21, 3, OTHER),
        contest(20, 4),
        // Ids past nextContestId read back as empty contests.
        contest(0, 0, ZERO, 0, 0),
      ]),
    ).toEqual({ previous: null, next: null });
  });

  test("skips missing weeks to the nearest one on each side", () => {
    const { previous, next } = findAdjacentWeekContests(contest(22, 4), [
      contest(15, 1),
      contest(19, 2),
      contest(30, 7),
      contest(26, 6),
    ]);
    expect(previous?.id).toBe(19);
    expect(next?.id).toBe(26);
  });

  test("crosses season types and years", () => {
    expect(
      findAdjacentWeekContests(contest(30, 1, BANKRBALL, 2), [
        contest(29, 3, BANKRBALL, 1),
      ]).previous?.id,
    ).toBe(29);
    expect(
      findAdjacentWeekContests(contest(39, 5, BANKRBALL, 3, 2026), [
        contest(40, 1, BANKRBALL, 2, 2027),
      ]).next?.id,
    ).toBe(40);
  });

  test("prefers the highest id when a week has several", () => {
    const { previous, next } = findAdjacentWeekContests(contest(22, 4), [
      contest(17, 3),
      contest(21, 3),
      contest(23, 5),
      contest(27, 5),
    ]);
    expect(previous?.id).toBe(21);
    expect(next?.id).toBe(27);
  });
});
