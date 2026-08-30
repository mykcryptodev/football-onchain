import { describe, expect, test } from "bun:test";

import {
  countLiveScore,
  formatPlace,
  getPickResult,
  isGameComplete,
  isGameInProgress,
  rankEntries,
  selectCurrentWeekContests,
} from "./pickem-scoring";

describe("pickem scoring", () => {
  test("treats STATUS_FINAL as complete", () => {
    expect(isGameComplete("STATUS_FINAL")).toBe(true);
    expect(isGameComplete("Final")).toBe(true);
    expect(isGameComplete("STATUS_SCHEDULED")).toBe(false);
  });

  test("detects in-progress games from status or scores", () => {
    expect(isGameInProgress("STATUS_IN_PROGRESS")).toBe(true);
    expect(isGameInProgress("STATUS_HALFTIME")).toBe(true);
    expect(isGameInProgress("STATUS_SCHEDULED", 7, 0)).toBe(true);
    expect(isGameInProgress("STATUS_SCHEDULED", 0, 0)).toBe(false);
    expect(isGameInProgress("STATUS_FINAL", 21, 17)).toBe(false);
  });

  test("marks completed picks as correct or wrong", () => {
    expect(
      getPickResult(
        { gameId: "1", homeScore: 24, awayScore: 17, status: "STATUS_FINAL" },
        1,
      ),
    ).toBe("correct");
    expect(
      getPickResult(
        { gameId: "1", homeScore: 24, awayScore: 17, status: "STATUS_FINAL" },
        0,
      ),
    ).toBe("wrong");
  });

  test("marks live picks as winning or losing", () => {
    expect(
      getPickResult(
        {
          gameId: "1",
          homeScore: 14,
          awayScore: 7,
          status: "STATUS_IN_PROGRESS",
        },
        1,
      ),
    ).toBe("live-winning");
    expect(
      getPickResult(
        {
          gameId: "1",
          homeScore: 14,
          awayScore: 7,
          status: "STATUS_IN_PROGRESS",
        },
        0,
      ),
    ).toBe("live-losing");
  });

  test("marks a finished tie as an incorrect pick", () => {
    expect(
      getPickResult(
        {
          gameId: "401873305",
          homeScore: 9,
          awayScore: 9,
          status: "STATUS_FINAL",
          completed: true,
        },
        1,
      ),
    ).toBe("wrong");
  });

  test("leaves unstarted games pending", () => {
    expect(getPickResult({ gameId: "1", status: "STATUS_SCHEDULED" }, 1)).toBe(
      "pending",
    );
  });

  test("counts live scores only for started games", () => {
    const gamesById = new Map([
      [
        "1",
        {
          gameId: "1",
          homeScore: 21,
          awayScore: 10,
          status: "STATUS_FINAL",
        },
      ],
      [
        "2",
        {
          gameId: "2",
          homeScore: 3,
          awayScore: 7,
          status: "STATUS_IN_PROGRESS",
        },
      ],
      ["3", { gameId: "3", status: "STATUS_SCHEDULED" }],
    ]);

    expect(countLiveScore([1, 0, 1], ["1", "2", "3"], gamesById)).toEqual({
      correctPicks: 2,
      scoredGames: 2,
    });
  });

  test("counts a finished tie as played but not correct", () => {
    const gamesById = new Map([
      [
        "401873305",
        {
          gameId: "401873305",
          homeScore: 9,
          awayScore: 9,
          status: "STATUS_FINAL",
          completed: true,
        },
      ],
    ]);

    expect(countLiveScore([1], ["401873305"], gamesById)).toEqual({
      correctPicks: 0,
      scoredGames: 1,
    });
  });

  test("ranks entries by correct picks then tiebreaker closeness", () => {
    const games = [
      { gameId: "1", homeScore: 24, awayScore: 17, status: "STATUS_FINAL" },
      { gameId: "2", homeScore: 20, awayScore: 23, status: "STATUS_FINAL" },
    ];
    const ranked = rankEntries(
      [
        { tokenId: 10, picks: [1, 0], tiebreakerPoints: 40 },
        { tokenId: 11, picks: [1, 0], tiebreakerPoints: 44 },
        { tokenId: 12, picks: [0, 1], tiebreakerPoints: 45 },
      ],
      ["1", "2"],
      games,
      "2",
    );

    expect(ranked.map(entry => entry.tokenId)).toEqual([11, 10, 12]);
    expect(ranked[0]).toMatchObject({
      tokenId: 11,
      correctPicks: 2,
      rank: 1,
    });
    expect(ranked[2]).toMatchObject({
      tokenId: 12,
      correctPicks: 0,
      rank: 3,
    });
  });

  test("formats place ordinals", () => {
    expect(formatPlace(1)).toBe("1st");
    expect(formatPlace(2)).toBe("2nd");
    expect(formatPlace(3)).toBe("3rd");
    expect(formatPlace(4)).toBe("4th");
    expect(formatPlace(11)).toBe("11th");
    expect(formatPlace(12)).toBe("12th");
    expect(formatPlace(13)).toBe("13th");
    expect(formatPlace(21)).toBe("21st");
  });
});

describe("current week matching", () => {
  const preseasonWeek1 = {
    year: 2026,
    seasonType: 1,
    weekNumber: 1,
    id: "pre-1",
  };
  const regularWeek1 = {
    year: 2026,
    seasonType: 2,
    weekNumber: 1,
    id: "reg-1",
  };
  const postseasonWeek1 = {
    year: 2026,
    seasonType: 3,
    weekNumber: 1,
    id: "post-1",
  };
  const regularWeek2 = {
    year: 2026,
    seasonType: 2,
    weekNumber: 2,
    id: "reg-2",
  };
  const preseasonWeek4 = {
    year: 2026,
    seasonType: 1,
    weekNumber: 4,
    id: "pre-4",
  };
  const regularWeek18 = {
    year: 2026,
    seasonType: 2,
    weekNumber: 18,
    id: "reg-18",
  };

  test("matches preseason, regular season, and postseason independently", () => {
    const contests = [preseasonWeek1, regularWeek1, postseasonWeek1];

    expect(
      selectCurrentWeekContests(contests, {
        seasonYear: 2026,
        seasonType: 1,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["pre-1"]);
    expect(
      selectCurrentWeekContests(contests, {
        seasonYear: 2026,
        seasonType: 2,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["reg-1"]);
    expect(
      selectCurrentWeekContests(contests, {
        seasonYear: 2026,
        seasonType: 3,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["post-1"]);
  });

  test("falls back to the previous week in the same season type", () => {
    expect(
      selectCurrentWeekContests([regularWeek1, regularWeek2], {
        seasonYear: 2026,
        seasonType: 2,
        week: 2,
      }).map(contest => contest.id),
    ).toEqual(["reg-2"]);

    expect(
      selectCurrentWeekContests([regularWeek1], {
        seasonYear: 2026,
        seasonType: 2,
        week: 2,
      }).map(contest => contest.id),
    ).toEqual(["reg-1"]);
  });

  test("falls back across season boundaries", () => {
    expect(
      selectCurrentWeekContests([preseasonWeek4, regularWeek1], {
        seasonYear: 2026,
        seasonType: 2,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["reg-1"]);

    expect(
      selectCurrentWeekContests([preseasonWeek4], {
        seasonYear: 2026,
        seasonType: 2,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["pre-4"]);

    expect(
      selectCurrentWeekContests([regularWeek18], {
        seasonYear: 2026,
        seasonType: 3,
        week: 1,
      }).map(contest => contest.id),
    ).toEqual(["reg-18"]);
  });
});
