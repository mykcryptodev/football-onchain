import { describe, expect, test } from "bun:test";

import { selectCurrentWeekContests, type WeekIdentity } from "./pickem-scoring";
import {
  etCivilToUTC,
  fetchFirstKickoffFromApi,
  resolveThisWeekEntries,
  tuesdayCutoffBeforeKickoff,
} from "./pickem-upcoming";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type TestContest = WeekIdentity & { id: string };

const c = (
  year: number,
  seasonType: number,
  weekNumber: number,
  id: string,
): TestContest => ({ year, seasonType, weekNumber, id });

const ref = (seasonYear: number, seasonType: number, week: number) => ({
  seasonYear,
  seasonType,
  week,
});

function utc(iso: string): Date {
  return new Date(iso);
}

// Stub builder: map of weekNumber → first kickoff ISO string (or null)
function stubFetch(
  kickoffs: Record<number, string | null>,
): (
  year: number,
  seasonType: number,
  weekNumber: number,
) => Promise<Date | null> {
  return async (_year, _seasonType, weekNumber) => {
    const iso = kickoffs[weekNumber];
    return iso ? new Date(iso) : null;
  };
}

// ---------------------------------------------------------------------------
// etCivilToUTC — primitive used inside tuesdayCutoffBeforeKickoff
// ---------------------------------------------------------------------------

describe("etCivilToUTC", () => {
  test("DST active: Sep 15 2026 8 PM ET = 2026-09-16T00:00Z (EDT = UTC-4)", () => {
    expect(etCivilToUTC(2026, 9, 15, 20, 0).toISOString()).toBe(
      "2026-09-16T00:00:00.000Z",
    );
  });

  test("Standard time: Nov 3 2026 8 PM ET = 2026-11-04T01:00Z (EST = UTC-5)", () => {
    expect(etCivilToUTC(2026, 11, 3, 20, 0).toISOString()).toBe(
      "2026-11-04T01:00:00.000Z",
    );
  });
});

// ---------------------------------------------------------------------------
// tuesdayCutoffBeforeKickoff
// ---------------------------------------------------------------------------

describe("tuesdayCutoffBeforeKickoff", () => {
  // Week 2 2026: first kickoff Thu Sep 18 00:15 UTC.
  // Preceding Tuesday: Sep 15. 8 PM EDT = Sep 16 00:00 UTC.
  test("Week 2 kickoff Thu Sep 18 → cutoff Sep 16 00:00 UTC", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-09-18T00:15Z")).toISOString(),
    ).toBe("2026-09-16T00:00:00.000Z");
  });

  // Week 1 2026: first kickoff Thu Sep 10 00:20 UTC.
  // Preceding Tuesday: Sep 8. 8 PM EDT = Sep 9 00:00 UTC.
  test("Week 1 kickoff Thu Sep 10 → cutoff Sep 9 00:00 UTC", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-09-10T00:20Z")).toISOString(),
    ).toBe("2026-09-09T00:00:00.000Z");
  });

  // Week 3: first kickoff Thu Sep 25. Preceding Tuesday: Sep 22. 8 PM EDT = Sep 23 00:00 UTC.
  test("Week 3 kickoff Thu Sep 25 → cutoff Sep 23 00:00 UTC", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-09-25T00:15Z")).toISOString(),
    ).toBe("2026-09-23T00:00:00.000Z");
  });

  // Post-DST (standard time): kickoff Sun Nov 8. Preceding Tuesday: Nov 3. 8 PM EST = Nov 4 01:00 UTC.
  test("Post-DST kickoff Sun Nov 8 → cutoff Nov 4 01:00 UTC (EST = UTC-5)", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-11-08T18:00Z")).toISOString(),
    ).toBe("2026-11-04T01:00:00.000Z");
  });

  // Kickoff on Sunday: preceding Tuesday is 5 days back.
  test("Sunday kickoff Sep 13 → cutoff Sep 9 00:00 UTC", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-09-13T17:00Z")).toISOString(),
    ).toBe("2026-09-09T00:00:00.000Z");
  });

  // Kickoff on Monday: preceding Tuesday is 6 days back.
  test("Monday kickoff Sep 14 → cutoff Sep 9 00:00 UTC", () => {
    expect(
      tuesdayCutoffBeforeKickoff(utc("2026-09-14T23:00Z")).toISOString(),
    ).toBe("2026-09-09T00:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// resolveThisWeekEntries — schedule-anchored, async
// ---------------------------------------------------------------------------

describe("resolveThisWeekEntries", () => {
  // Real dates: Sept 16 13:23 UTC — Wednesday after Week 1 finished.
  // ESPN stale at Week 1 or fresh at Week 2.
  // Week 2 first kickoff: 2026-09-18T00:15Z.
  // Week 2 cutoff:        2026-09-16T00:00Z (Tue Sep 15 8 PM EDT).
  // Week 3 first kickoff (hypothetical): 2026-09-25T00:15Z.
  // Week 3 cutoff:        2026-09-23T00:00Z.

  const sep16 = utc("2026-09-16T13:23Z");
  const espnWeek1 = ref(2026, 2, 1);
  const espnWeek2 = ref(2026, 2, 2);

  const w1 = c(2026, 2, 1, "w1");
  const w2 = c(2026, 2, 2, "w2");
  const w3 = c(2026, 2, 3, "w3");

  const kickoffsW2 = stubFetch({ 2: "2026-09-18T00:15Z" });
  const kickoffsW2W3 = stubFetch({
    2: "2026-09-18T00:15Z",
    3: "2026-09-25T00:15Z",
  });

  // ---- THE KEY BUG REGRESSIONS ----

  test("Sept16, ESPN=Week1 stale, owns Week1+2 → promotes Week2", async () => {
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      sep16,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  test("Sept16, ESPN=Week1 stale, owns Week1+2+3 → promotes Week2 NOT Week3", async () => {
    // This is the exact scenario from the review failure.
    // minWeek above current(1) is 2; Week2 cutoff passed; Week3 ignored.
    const result = await resolveThisWeekEntries(
      [w1, w2, w3],
      espnWeek1,
      sep16,
      kickoffsW2W3,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  test("Sept16, ESPN=Week2 fresh, owns Week2+3 → no promotion (Week3 cutoff not passed)", async () => {
    // minWeek above current(2) is 3; Week3 cutoff Sep23 > Sep16 → no promotion.
    // selectCurrentWeekContests: exact match w2.
    const result = await resolveThisWeekEntries(
      [w2, w3],
      espnWeek2,
      sep16,
      kickoffsW2W3,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  // ---- FRIDAY (ACTIVE WEEK2 GAMES): must NOT promote Week3 ----

  test("Sept19 (Fri, Week2 active), ESPN=Week2, owns Week2+3 → stays Week2", async () => {
    const sep19 = utc("2026-09-19T20:00Z");
    // Week3 cutoff = Sep23 00:00 UTC; Sep19 < Sep23 → no promotion.
    const result = await resolveThisWeekEntries(
      [w2, w3],
      espnWeek2,
      sep19,
      kickoffsW2W3,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  // ---- SUNDAY / MONDAY: before cutoff, no promotion ----

  test("Sunday Sep13 (before Week2 cutoff), ESPN=Week1, owns Week1+2 → stays Week1", async () => {
    const sun = utc("2026-09-13T20:00Z");
    // Week2 cutoff = Sep16 00:00 UTC; Sep13 < cutoff → no promotion.
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      sun,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  test("Monday Sep14, ESPN=Week1, owns Week1+2 → stays Week1", async () => {
    const mon = utc("2026-09-14T20:00Z");
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      mon,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  // ---- TUESDAY BOUNDARY (EDT, DST active) ----

  test("Tue Sep15 23:59 UTC (7:59 PM EDT, 1 min before cutoff) → stays Week1", async () => {
    const tueBefore = utc("2026-09-15T23:59Z");
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      tueBefore,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  test("Sep16 00:00 UTC (exactly Tue 8 PM EDT) → promotes Week2", async () => {
    const tueAt = utc("2026-09-16T00:00Z");
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      tueAt,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  test("Sep16 00:01 UTC (1 min after Tue 8 PM EDT) → promotes Week2", async () => {
    const tueAfter = utc("2026-09-16T00:01Z");
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      tueAfter,
      kickoffsW2,
    );
    expect(result.map(x => x.id)).toEqual(["w2"]);
  });

  // ---- TUESDAY BOUNDARY (EST, standard time) ----
  // Nov 3 2026 is a Tuesday (standard time, ET = UTC-5).
  // 8 PM EST = Nov 4 01:00 UTC.
  // Hypothetical Week 10 kickoff: Nov 8. cutoff = Nov 4 01:00 UTC.

  test("Nov 4 00:59 UTC (7:59 PM EST, Tue Nov3) → stays Week9 (before cutoff)", async () => {
    const espnWeek9 = ref(2026, 2, 9);
    const w9 = c(2026, 2, 9, "w9");
    const w10 = c(2026, 2, 10, "w10");
    const kickoffsW10 = stubFetch({ 10: "2026-11-08T18:00Z" });
    const result = await resolveThisWeekEntries(
      [w9, w10],
      espnWeek9,
      utc("2026-11-04T00:59Z"),
      kickoffsW10,
    );
    expect(result.map(x => x.id)).toEqual(["w9"]);
  });

  test("Nov 4 01:00 UTC (exactly 8 PM EST, Tue Nov3) → promotes Week10", async () => {
    const espnWeek9 = ref(2026, 2, 9);
    const w9 = c(2026, 2, 9, "w9");
    const w10 = c(2026, 2, 10, "w10");
    const kickoffsW10 = stubFetch({ 10: "2026-11-08T18:00Z" });
    const result = await resolveThisWeekEntries(
      [w9, w10],
      espnWeek9,
      utc("2026-11-04T01:00Z"),
      kickoffsW10,
    );
    expect(result.map(x => x.id)).toEqual(["w10"]);
  });

  // ---- CONSERVATIVE FALLBACK on missing / erroring schedule data ----

  test("fetchFirstKickoff returns null → falls back to selectCurrentWeekContests", async () => {
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      sep16,
      stubFetch({ 2: null }),
    );
    // Conservative: no cutoff derivable → exact match w1 (ESPN=Week1)
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  test("fetchFirstKickoff throws → falls back to selectCurrentWeekContests", async () => {
    const result = await resolveThisWeekEntries(
      [w1, w2],
      espnWeek1,
      sep16,
      async () => {
        throw new Error("network error");
      },
    );
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  // ---- NO OWNED UPCOMING ENTRIES ----

  test("owns only current week → selectCurrentWeekContests (no candidates ahead)", async () => {
    const result = await resolveThisWeekEntries(
      [w1],
      espnWeek1,
      sep16,
      kickoffsW2,
    );
    // No candidates above week 1 → selectCurrentWeekContests → w1 exact
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  test("empty wallet → []", async () => {
    const result = await resolveThisWeekEntries(
      [],
      espnWeek1,
      sep16,
      kickoffsW2,
    );
    expect(result).toEqual([]);
  });

  // ---- MULTIPLE TOKENS / CONTESTS IN THE UPCOMING WEEK ----

  test("multiple contests in upcoming week are all returned", async () => {
    const w2a = { year: 2026, seasonType: 2, weekNumber: 2, id: "w2a" };
    const w2b = { year: 2026, seasonType: 2, weekNumber: 2, id: "w2b" };
    const result = await resolveThisWeekEntries(
      [w1, w2a, w2b],
      espnWeek1,
      sep16,
      kickoffsW2,
    );
    expect(result.map(x => x.id).sort()).toEqual(["w2a", "w2b"]);
  });

  // ---- SEASON BOUNDARY: cross-type not a candidate ----

  test("postseason entry is not a candidate when ESPN is in regular season", async () => {
    // espnWeek18 = regular season 2. post1 = postseason (type 3).
    // post1 has different seasonType → not a candidate for promotion.
    const reg18 = c(2026, 2, 18, "reg18");
    const post1 = c(2026, 3, 1, "post1");
    const espnReg18 = ref(2026, 2, 18);
    const result = await resolveThisWeekEntries(
      [reg18, post1],
      espnReg18,
      sep16,
      stubFetch({}),
    );
    // selectCurrentWeekContests: exact reg18
    expect(result.map(x => x.id)).toEqual(["reg18"]);
  });

  test("different-year entry is not a candidate", async () => {
    const w2026w1 = c(2026, 2, 1, "2026w1");
    const w2027w2 = c(2027, 2, 2, "2027w2");
    const result = await resolveThisWeekEntries(
      [w2026w1, w2027w2],
      espnWeek1,
      sep16,
      stubFetch({}),
    );
    // 2027w2 different year → no candidate → fallback → 2026w1 exact
    expect(result.map(x => x.id)).toEqual(["2026w1"]);
  });

  // ---- REGRESSION: existing selectCurrentWeekContests fallbacks preserved ----

  test("before cutoff: previous-week fallback (ESPN=Week2, owns only Week1)", async () => {
    const mon = utc("2026-09-14T12:00Z");
    // minWeek above espnWeek2 = 3; Week3 cutoff Sep23 > Sep14 → no promotion.
    // selectCurrentWeekContests: no w2 exact, prev-week w1 → w1.
    const result = await resolveThisWeekEntries(
      [w1],
      espnWeek2,
      mon,
      stubFetch({ 3: "2026-09-25T00:15Z" }),
    );
    expect(result.map(x => x.id)).toEqual(["w1"]);
  });

  test("cross-season fallback (preseason → regular) preserved when no candidates", async () => {
    const mon = utc("2026-09-14T12:00Z");
    const pre4 = c(2026, 1, 4, "pre4");
    const espnReg1 = ref(2026, 2, 1);
    // pre4 is seasonType 1, not 2 → no candidate for regular-season promotion.
    const result = await resolveThisWeekEntries(
      [pre4],
      espnReg1,
      mon,
      stubFetch({}),
    );
    // selectCurrentWeekContests cross-season fallback → pre4
    expect(result.map(x => x.id)).toEqual(["pre4"]);
  });

  test("cross-season fallback (regular → postseason) preserved when no candidates", async () => {
    const mon = utc("2026-09-14T12:00Z");
    const reg18 = c(2026, 2, 18, "reg18");
    const espnPost1 = ref(2026, 3, 1);
    const result = await resolveThisWeekEntries(
      [reg18],
      espnPost1,
      mon,
      stubFetch({}),
    );
    expect(result.map(x => x.id)).toEqual(["reg18"]);
  });
});

// ---------------------------------------------------------------------------
// fetchFirstKickoffFromApi — unit tests (no live network)
// ---------------------------------------------------------------------------

describe("fetchFirstKickoffFromApi", () => {
  test("exported as a 3-argument function", () => {
    expect(typeof fetchFirstKickoffFromApi).toBe("function");
    expect(fetchFirstKickoffFromApi.length).toBe(3);
  });

  test("returns null when fetch throws (network offline)", async () => {
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error("offline");
      };
      expect(await fetchFirstKickoffFromApi(2026, 2, 2)).toBeNull();
    } finally {
      globalThis.fetch = orig;
    }
  });

  test("returns null when response is not ok (502)", async () => {
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: "bad gateway" }), { status: 502 });
      expect(await fetchFirstKickoffFromApi(2026, 2, 2)).toBeNull();
    } finally {
      globalThis.fetch = orig;
    }
  });

  test("returns null for an empty games list", async () => {
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(JSON.stringify([]), { status: 200 });
      expect(await fetchFirstKickoffFromApi(2026, 2, 2)).toBeNull();
    } finally {
      globalThis.fetch = orig;
    }
  });

  test("returns the earliest kickoff as a Date", async () => {
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify([
            { kickoff: "2026-09-18T00:15Z" },
            { kickoff: "2026-09-21T17:00Z" },
          ]),
          { status: 200 },
        );
      const result = await fetchFirstKickoffFromApi(2026, 2, 2);
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe("2026-09-18T00:15:00.000Z");
    } finally {
      globalThis.fetch = orig;
    }
  });

  test("games missing kickoff field are skipped; valid games still return a date", async () => {
    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify([
            { homeTeam: "TBD" }, // no kickoff
            { kickoff: "2026-09-21T17:00Z" },
          ]),
          { status: 200 },
        );
      const result = await fetchFirstKickoffFromApi(2026, 2, 2);
      expect(result!.toISOString()).toBe("2026-09-21T17:00:00.000Z");
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Hook wiring contract: the hook calls resolveThisWeekEntries with
// fetchFirstKickoffFromApi. This test exercises the exact call path
// (minus thirdweb/React context) and confirms the correct output for the
// Sept 16 stale-ESPN scenario.
// ---------------------------------------------------------------------------

describe("hook wiring contract (orchestration with fetchFirstKickoffFromApi)", () => {
  test("Sept16 stale-ESPN + Week2 stub → selects Week2 (not Week3)", async () => {
    // Matches the hook's call: resolveThisWeekEntries(contests, currentWeek, new Date(), fetchFirstKickoffFromApi)
    const contests = [
      { year: 2026, seasonType: 2, weekNumber: 1, contestId: 99 },
      { year: 2026, seasonType: 2, weekNumber: 2, contestId: 100 },
      { year: 2026, seasonType: 2, weekNumber: 3, contestId: 101 },
    ];
    const espnWeek1 = ref(2026, 2, 1);
    const sep16 = utc("2026-09-16T13:23Z");

    const orig = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("week=2")) {
          return new Response(
            JSON.stringify([{ kickoff: "2026-09-18T00:15Z" }]),
            { status: 200 },
          );
        }
        if (url.includes("week=3")) {
          return new Response(
            JSON.stringify([{ kickoff: "2026-09-25T00:15Z" }]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify([]), { status: 200 });
      };

      const result = await resolveThisWeekEntries(
        contests,
        espnWeek1,
        sep16,
        fetchFirstKickoffFromApi,
      );
      // minWeek above 1 = 2; Week2 cutoff Sep16 00:00 UTC < now Sep16 13:23 → promotes Week2
      // Week3 is never even considered (minWeek logic).
      expect(result.map(x => x.weekNumber)).toEqual([2]);
      expect(result.map(x => (x as (typeof contests)[0]).contestId)).toEqual([
        100,
      ]);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Regression: selectCurrentWeekContests unchanged by this module
// ---------------------------------------------------------------------------

describe("selectCurrentWeekContests (regression)", () => {
  test("exact match still works", () => {
    const w2: WeekIdentity = { year: 2026, seasonType: 2, weekNumber: 2 };
    expect(selectCurrentWeekContests([w2], ref(2026, 2, 2))).toEqual([w2]);
  });

  test("previous-week fallback still works", () => {
    const w1: WeekIdentity = { year: 2026, seasonType: 2, weekNumber: 1 };
    expect(selectCurrentWeekContests([w1], ref(2026, 2, 2))).toEqual([w1]);
  });
});
