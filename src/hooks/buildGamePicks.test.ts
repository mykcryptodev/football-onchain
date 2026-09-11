import { describe, expect, mock, test } from "bun:test";

import type { WeekGameApi } from "./useMyCurrentWeekPicks";

// The hook module pulls in the thirdweb client; only the pure helper is under test.
mock.module("@/providers/Thirdweb", () => ({ client: {} }));
const { buildGamePicks } = await import("./useMyCurrentWeekPicks");

const game = (
  gameId: string,
  kickoff: string,
  extra: Partial<WeekGameApi> = {},
) =>
  ({
    gameId,
    homeTeam: `Home ${gameId}`,
    awayTeam: `Away ${gameId}`,
    homeRecord: "",
    awayRecord: "",
    kickoff,
    ...extra,
  }) as WeekGameApi;

describe("buildGamePicks", () => {
  const gameIds = ["2", "1"];
  const games = [
    game("1", "2026-09-13T17:00:00Z"),
    game("2", "2026-09-11T00:20:00Z", {
      homeScore: 13,
      awayScore: 10,
      completed: true,
    }),
  ];
  const owner = "0xOwner";
  const entries = [
    { owner: "0xowner", picks: [1, 0] },
    { owner: "0xA", picks: [1, 1] },
    { owner: "0xa", picks: [0, 1] }, // same wallet, second entry
    { owner: "0xB", picks: [0, 0] },
  ];

  const rows = buildGamePicks(gameIds, games, [1, 0], entries, owner);

  test("maps picks by gameIds index and sorts rows by kickoff", () => {
    expect(rows.map(r => r.gameId)).toEqual(["2", "1"]);
    expect(rows[0].pick).toBe(1);
    expect(rows[0].result).toBe("correct");
    expect(rows[1].pick).toBe(0);
  });

  test("pickers are deduped per wallet and leave out the entry owner", () => {
    // game "2" (index 0): 0xa picked home (1) and away (0) across two entries
    expect(rows[0].homePickers).toEqual(["0xa"]);
    expect(rows[0].awayPickers.sort()).toEqual(["0xa", "0xb"]);
    // game "1" (index 1)
    expect(rows[1].homePickers).toEqual(["0xa"]);
    expect(rows[1].awayPickers).toEqual(["0xb"]);
  });

  test("a game missing from the feed falls back to a pending row", () => {
    const [row] = buildGamePicks(["9"], games, [0], entries, owner);
    expect(row.result).toBe("pending");
    expect(row.awayPickers.sort()).toEqual(["0xa", "0xb"]);
  });
});
