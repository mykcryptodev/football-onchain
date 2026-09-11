import { afterEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import { POST } from "./route";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const competition = (
  name: string,
  completed: boolean,
  home: string,
  away: string,
) => ({
  status: { type: { name, completed } },
  competitors: [
    { id: "h", homeAway: "home", score: home },
    { id: "a", homeAway: "away", score: away },
  ],
});

describe("live rankings", () => {
  test("only games that have started count toward the scored total", async () => {
    globalThis.fetch = (async () =>
      Response.json({
        events: [
          {
            id: "1",
            competitions: [competition("STATUS_FINAL", true, "13", "10")],
          },
          {
            id: "2",
            competitions: [competition("STATUS_IN_PROGRESS", false, "7", "10")],
          },
          {
            id: "3",
            competitions: [competition("STATUS_SCHEDULED", false, "0", "0")],
          },
          {
            id: "4",
            competitions: [competition("STATUS_SCHEDULED", false, "0", "0")],
          },
        ],
      })) as unknown as typeof fetch;

    const response = await POST(
      new NextRequest("http://localhost/api/contest/15/live-rankings", {
        method: "POST",
        body: JSON.stringify({
          gameIds: ["1", "2", "3", "4"],
          tiebreakerGameId: "4",
          year: 2026,
          seasonType: 2,
          weekNumber: 1,
          picks: [
            {
              tokenId: 1,
              owner: "0xa",
              picks: [1, 0, 1, 1],
              correctPicks: 0,
              tiebreakerPoints: 40,
            },
            {
              tokenId: 2,
              owner: "0xb",
              picks: [0, 1, 0, 0],
              correctPicks: 0,
              tiebreakerPoints: 40,
            },
          ],
        }),
      }),
    );
    const { picks } = await response.json();
    const byToken = Object.fromEntries(
      picks.map((p: { tokenId: number }) => [p.tokenId, p]),
    );
    // 2 of 4 games have started (one final, one live), not all 4.
    expect(byToken[1].liveTotalScoredGames).toBe(2);
    expect(byToken[1].liveCorrectPicks).toBe(2);
    expect(byToken[2].liveTotalScoredGames).toBe(2);
    expect(byToken[2].liveCorrectPicks).toBe(0);
  });
});
