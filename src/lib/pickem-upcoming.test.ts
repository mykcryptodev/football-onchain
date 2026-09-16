import { describe, expect, test } from "bun:test";

import { selectCurrentWeekContests, type WeekIdentity } from "./pickem-scoring";
import {
  isPastTuesdayCutoff,
  nextWeekRef,
  resolveThisWeekEntries,
} from "./pickem-upcoming";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const w = (
  year: number,
  seasonType: number,
  weekNumber: number,
): WeekIdentity => ({ year, seasonType, weekNumber });

const current = (seasonYear: number, seasonType: number, week: number) => ({
  seasonYear,
  seasonType,
  week,
});

// ET offset helpers — do NOT assume a fixed offset; test uses known civil times.
// 2026-09-15 is Tuesday (daylight saving active, ET = UTC-4).
// 2026-11-03 is Tuesday (standard time, ET = UTC-5), just after DST ends Nov 1.

function utcDate(isoString: string): Date {
  return new Date(isoString);
}

// ---------------------------------------------------------------------------
// isPastTuesdayCutoff
// ---------------------------------------------------------------------------

describe("isPastTuesdayCutoff", () => {
  // DST-on Tuesdays (ET = UTC-4 in September)
  test("Tuesday 7:59 PM ET (DST) is before cutoff", () => {
    // 7:59 PM ET = 23:59 UTC
    expect(isPastTuesdayCutoff(utcDate("2026-09-15T23:59:00Z"))).toBe(false);
  });

  test("Tuesday 8:00 PM ET (DST) is at cutoff", () => {
    // 8:00 PM ET = 00:00 UTC next day (Wednesday)
    // Actually 8 PM ET DST = UTC-4 => 2026-09-16T00:00:00Z
    expect(isPastTuesdayCutoff(utcDate("2026-09-16T00:00:00Z"))).toBe(true);
  });

  test("Tuesday 8:01 PM ET (DST) is past cutoff", () => {
    expect(isPastTuesdayCutoff(utcDate("2026-09-16T00:01:00Z"))).toBe(true);
  });

  // Standard time Tuesday (ET = UTC-5, after DST ends)
  test("Tuesday 7:59 PM ET (standard) is before cutoff", () => {
    // Standard time: ET = UTC-5. 7:59 PM Tuesday Nov 3 ET = Nov 4 00:59 UTC.
    expect(isPastTuesdayCutoff(utcDate("2026-11-04T00:59:00Z"))).toBe(false);
  });

  test("Tuesday 8:00 PM ET (standard) is at cutoff", () => {
    // 8:00 PM Tuesday Nov 3 ET = Nov 4 01:00 UTC.
    expect(isPastTuesdayCutoff(utcDate("2026-11-04T01:00:00Z"))).toBe(true);
  });

  test("Wednesday morning is past cutoff", () => {
    expect(isPastTuesdayCutoff(utcDate("2026-09-16T12:00:00Z"))).toBe(true);
  });

  test("Friday afternoon is past cutoff", () => {
    expect(isPastTuesdayCutoff(utcDate("2026-09-18T18:00:00Z"))).toBe(true);
  });

  test("Sunday is before cutoff", () => {
    expect(isPastTuesdayCutoff(utcDate("2026-09-13T20:00:00Z"))).toBe(false);
  });

  test("Monday is before cutoff", () => {
    expect(isPastTuesdayCutoff(utcDate("2026-09-14T23:00:00Z"))).toBe(false);
  });

  test("Tuesday midnight ET is before cutoff", () => {
    // Midnight ET (DST) = 04:00 UTC
    expect(isPastTuesdayCutoff(utcDate("2026-09-15T04:00:00Z"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// nextWeekRef
// ---------------------------------------------------------------------------

describe("nextWeekRef", () => {
  test("advances regular season week by one", () => {
    expect(nextWeekRef(current(2026, 2, 1))).toEqual(current(2026, 2, 2));
    expect(nextWeekRef(current(2026, 2, 17))).toEqual(current(2026, 2, 18));
  });

  test("returns null at regular season week 18 (last week)", () => {
    expect(nextWeekRef(current(2026, 2, 18))).toBeNull();
  });

  test("advances preseason week by one up to 4", () => {
    expect(nextWeekRef(current(2026, 1, 3))).toEqual(current(2026, 1, 4));
  });

  test("returns null at preseason week 4", () => {
    expect(nextWeekRef(current(2026, 1, 4))).toBeNull();
  });

  test("returns null at postseason (conservative, no simple +1)", () => {
    // Postseason week 5 is the last supported week
    expect(nextWeekRef(current(2026, 3, 5))).toBeNull();
  });

  test("postseason week 1 still advances within the type", () => {
    expect(nextWeekRef(current(2026, 3, 1))).toEqual(current(2026, 3, 2));
  });

  test("preserves year and season type", () => {
    const result = nextWeekRef(current(2026, 2, 5));
    expect(result?.seasonYear).toBe(2026);
    expect(result?.seasonType).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// resolveThisWeekEntries
// ---------------------------------------------------------------------------

describe("resolveThisWeekEntries", () => {
  const week1 = w(2026, 2, 1);
  const week2 = w(2026, 2, 2);
  const week3 = w(2026, 2, 3);

  const espnWeek1 = current(2026, 2, 1);
  const espnWeek2 = current(2026, 2, 2);

  // Past-cutoff date: Wednesday morning ET
  const wed = utcDate("2026-09-16T12:00:00Z");
  // Before-cutoff date: Monday
  const mon = utcDate("2026-09-14T12:00:00Z");
  // Tuesday before cutoff
  const tueBefore = utcDate("2026-09-15T23:30:00Z"); // 7:30 PM ET (DST)
  // Tuesday exactly at cutoff
  const tueAt = utcDate("2026-09-16T00:00:00Z"); // 8:00 PM ET (DST)

  // ---- loading states ----

  test("returns [] while isLoading is true, regardless of arguments", () => {
    const entries = [week1, week2];
    expect(resolveThisWeekEntries(entries, espnWeek2, wed, true)).toEqual([]);
  });

  test("returns [] when currentWeek is null", () => {
    expect(resolveThisWeekEntries([week1, week2], null, wed, false)).toEqual(
      [],
    );
  });

  // ---- before-cutoff: always use selectCurrentWeekContests ----

  test("before cutoff: returns current-week entries (ESPN week 1, owns week 1)", () => {
    const result = resolveThisWeekEntries([week1], espnWeek1, mon, false);
    expect(result).toEqual([week1]);
  });

  test("before cutoff: does NOT promote upcoming week even when wallet owns week 2", () => {
    const result = resolveThisWeekEntries(
      [week1, week2],
      espnWeek1,
      mon,
      false,
    );
    // selectCurrentWeekContests finds exact match: week1
    expect(result).toEqual([week1]);
  });

  test("before cutoff (Tuesday 7:59 PM ET): still falls back to existing selector", () => {
    const result = resolveThisWeekEntries(
      [week1, week2],
      espnWeek1,
      tueBefore,
      false,
    );
    expect(result).toEqual([week1]);
  });

  // ---- at/after cutoff: promote upcoming if wallet owns it ----

  test("at exact cutoff: promotes upcoming week when wallet owns it", () => {
    const result = resolveThisWeekEntries(
      [week1, week2],
      espnWeek1,
      tueAt,
      false,
    );
    expect(result).toEqual([week2]);
  });

  test("after cutoff: promotes upcoming week (Week 2) when wallet owns it", () => {
    const result = resolveThisWeekEntries(
      [week1, week2],
      espnWeek1,
      wed,
      false,
    );
    expect(result).toEqual([week2]);
  });

  test("after cutoff: falls back to existing selector when wallet owns no upcoming entries", () => {
    // Owns week 1 only; week 2 not owned
    const result = resolveThisWeekEntries([week1], espnWeek1, wed, false);
    // selectCurrentWeekContests returns week1 (exact match)
    expect(result).toEqual([week1]);
  });

  test("after cutoff: falls back when ESPN is already on the upcoming week", () => {
    // ESPN already says Week 2; nextWeekRef gives Week 3
    // Wallet owns week1 and week2, but NOT week3
    const result = resolveThisWeekEntries(
      [week1, week2],
      espnWeek2,
      wed,
      false,
    );
    // nextWeekRef(week2) = week3, wallet doesn't own week3 → fallback
    // selectCurrentWeekContests(espnWeek2) → week2 (exact)
    expect(result).toEqual([week2]);
  });

  test("after cutoff: promotes week 3 when ESPN is at week 2 and wallet owns week 3", () => {
    const result = resolveThisWeekEntries(
      [week2, week3],
      espnWeek2,
      wed,
      false,
    );
    expect(result).toEqual([week3]);
  });

  test("after cutoff: returns only the upcoming week's entries, not all entries", () => {
    const result = resolveThisWeekEntries(
      [week1, week2, week3],
      espnWeek1,
      wed,
      false,
    );
    // nextWeekRef(week1) = week2; wallet has week2
    expect(result).toEqual([week2]);
  });

  test("after cutoff: ignores far-future weeks (week 3+) when upcoming is week 2", () => {
    const result = resolveThisWeekEntries(
      [week1, week3],
      espnWeek1,
      wed,
      false,
    );
    // nextWeekRef(week1) = week2; wallet doesn't own week2 → fallback
    expect(result).toEqual([week1]);
  });

  // ---- empty wallet ----

  test("empty wallet returns empty (isLoading=false, currentWeek set)", () => {
    const result = resolveThisWeekEntries([], espnWeek1, wed, false);
    // selectCurrentWeekContests([], week1) = []
    expect(result).toEqual([]);
  });

  // ---- season boundary: week 18 ----

  test("after cutoff: no promotion at regular season Week 18 (no Week 19 exists)", () => {
    const week18 = w(2026, 2, 18);
    const espnWeek18 = current(2026, 2, 18);
    const result = resolveThisWeekEntries([week18], espnWeek18, wed, false);
    // nextWeekRef returns null → fallback → week18 exact match
    expect(result).toEqual([week18]);
  });

  // ---- preseason season boundary ----

  test("after cutoff: no promotion at preseason Week 4 (no Week 5 in preseason)", () => {
    const pre4 = w(2026, 1, 4);
    const espnPre4 = current(2026, 1, 4);
    const result = resolveThisWeekEntries([pre4], espnPre4, wed, false);
    expect(result).toEqual([pre4]);
  });

  // ---- multiple entries in same week ----

  test("after cutoff: returns all upcoming-week entries (multiple tokens/contests)", () => {
    // Simulate two tokens in week 2 (same year/type/week, same WeekIdentity shape)
    const w2a = { year: 2026, seasonType: 2, weekNumber: 2, contestId: 10 };
    const w2b = { year: 2026, seasonType: 2, weekNumber: 2, contestId: 11 };
    const result = resolveThisWeekEntries(
      [week1, w2a, w2b],
      espnWeek1,
      wed,
      false,
    );
    expect(result).toHaveLength(2);
    expect(result).toContain(w2a);
    expect(result).toContain(w2b);
  });

  // ---- regression: existing fallback behaviour preserved ----

  test("before cutoff: previous-week fallback still works when no current-week entry", () => {
    // ESPN is on week 2 but wallet only has week 1 entries
    const result = resolveThisWeekEntries([week1], espnWeek2, mon, false);
    // selectCurrentWeekContests fallback: week2 exact = none, week1 (prev) matches
    expect(result).toEqual([week1]);
  });

  test("before cutoff: cross-season fallback still works (preseason → regular)", () => {
    const pre4 = w(2026, 1, 4);
    const espnReg1 = current(2026, 2, 1);
    const result = resolveThisWeekEntries([pre4], espnReg1, mon, false);
    // selectCurrentWeekContests cross-season path
    expect(result).toEqual([pre4]);
  });

  test("before cutoff: cross-season fallback (regular → postseason)", () => {
    const reg18 = w(2026, 2, 18);
    const espnPost1 = current(2026, 3, 1);
    const result = resolveThisWeekEntries([reg18], espnPost1, mon, false);
    expect(result).toEqual([reg18]);
  });
});

// ---------------------------------------------------------------------------
// Regression: selectCurrentWeekContests unchanged
// ---------------------------------------------------------------------------

describe("selectCurrentWeekContests (regression)", () => {
  test("exact match wins immediately even after cutoff (no upstream change)", () => {
    const week2 = w(2026, 2, 2);
    const espnWeek2 = current(2026, 2, 2);
    const result = selectCurrentWeekContests([week2], espnWeek2);
    expect(result).toEqual([week2]);
  });

  test("previous-week fallback still works", () => {
    const week1 = w(2026, 2, 1);
    const espnWeek2 = current(2026, 2, 2);
    const result = selectCurrentWeekContests([week1], espnWeek2);
    expect(result).toEqual([week1]);
  });
});
