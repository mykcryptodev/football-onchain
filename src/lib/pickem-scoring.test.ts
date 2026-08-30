import { describe, expect, test } from "bun:test";

import {
  countLiveScore,
  formatPlace,
  getPickResult,
  isGameComplete,
  isGameInProgress,
  rankEntries,
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
