import { describe, expect, test } from "bun:test";

import {
  getPickemWinner,
  isCurrentWeekPickem,
  pairPicksWithGames,
  type PickemChoiceGame,
} from "./pickem-choices";

function game(
  overrides: Partial<PickemChoiceGame> & Pick<PickemChoiceGame, "gameId">,
): PickemChoiceGame {
  return {
    homeTeam: "Home",
    awayTeam: "Away",
    kickoff: "2026-09-06T17:00:00Z",
    ...overrides,
  };
}

describe("getPickemWinner", () => {
  test("returns null until the game is final with scores", () => {
    expect(
      getPickemWinner(game({ gameId: "1", status: "STATUS_IN_PROGRESS" })),
    ).toBeNull();
    expect(
      getPickemWinner(
        game({ gameId: "1", status: "STATUS_FINAL", homeScore: 21 }),
      ),
    ).toBeNull();
  });

  test("returns 1 for home and 0 for away", () => {
    expect(
      getPickemWinner(
        game({
          gameId: "1",
          status: "STATUS_FINAL",
          homeScore: 24,
          awayScore: 17,
        }),
      ),
    ).toBe(1);
    expect(
      getPickemWinner(
        game({
          gameId: "1",
          status: "STATUS_FINAL",
          homeScore: 10,
          awayScore: 27,
        }),
      ),
    ).toBe(0);
  });
});

describe("pairPicksWithGames", () => {
  test("maps picks by contest game id and sorts by kickoff", () => {
    const later = game({
      gameId: "200",
      kickoff: "2026-09-07T17:00:00Z",
      homeAbbreviation: "KC",
      awayAbbreviation: "BUF",
    });
    const earlier = game({
      gameId: "100",
      kickoff: "2026-09-06T17:00:00Z",
      homeAbbreviation: "PHI",
      awayAbbreviation: "DAL",
      status: "STATUS_FINAL",
      homeScore: 31,
      awayScore: 10,
    });

    const paired = pairPicksWithGames(["200", "100"], [0, 1], [later, earlier]);

    expect(paired.map(choice => choice.game.gameId)).toEqual(["100", "200"]);
    expect(paired[0]).toMatchObject({
      pick: 1,
      status: "correct",
    });
    expect(paired[1]).toMatchObject({
      pick: 0,
      status: "pending",
    });
  });

  test("marks a finalized miss as wrong", () => {
    const [choice] = pairPicksWithGames(
      ["1"],
      [0],
      [
        game({
          gameId: "1",
          status: "STATUS_FINAL",
          homeScore: 20,
          awayScore: 3,
        }),
      ],
    );

    expect(choice.status).toBe("wrong");
  });
});

describe("isCurrentWeekPickem", () => {
  const currentWeek = { year: 2026, seasonType: 2, weekNumber: 1 };

  test("returns false when current week is unknown", () => {
    expect(
      isCurrentWeekPickem({ year: 2026, seasonType: 2, weekNumber: 1 }, null),
    ).toBe(false);
  });

  test("matches only the current NFL week", () => {
    expect(
      isCurrentWeekPickem(
        { year: 2026, seasonType: 2, weekNumber: 1 },
        currentWeek,
      ),
    ).toBe(true);
    expect(
      isCurrentWeekPickem(
        { year: 2026, seasonType: 2, weekNumber: 2 },
        currentWeek,
      ),
    ).toBe(false);
    expect(
      isCurrentWeekPickem(
        { year: 2025, seasonType: 2, weekNumber: 1 },
        currentWeek,
      ),
    ).toBe(false);
  });
});
