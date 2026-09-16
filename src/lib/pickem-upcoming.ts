/**
 * Schedule-anchored "This week" promotion.
 *
 * Rule: promote a candidate slate when the Tuesday-8-PM-ET that immediately
 * PRECEDES that slate's first kickoff has already passed. The cutoff is
 * derived from the actual game schedule, not the current weekday alone.
 *
 * What this prevents
 * ------------------
 * - Naive +1 (wrong): on Wednesday with ESPN=Week2, owned Weeks 2+3, a
 *   plain next-week-ref would compute Week3 as "upcoming" and promote it,
 *   which is wrong because Week2 is the active slate.
 *
 * Algorithm
 * ---------
 *  1. Among all owned contests, find those STRICTLY AHEAD of currentWeek
 *     in the SAME season type and year.
 *  2. Take the MINIMUM weekNumber among those candidates (immediately next only).
 *  3. Fetch the candidate slate's first kickoff via the injected callback.
 *     On error/null → fall back conservatively.
 *  4. Compute tuesdayCutoffBeforeKickoff(firstKickoff).
 *  5. If now >= cutoff → promote those contests.
 *  6. Otherwise → selectCurrentWeekContests(contests, currentWeek).
 *
 * All-weeks and numeric-contestId scopes are unaffected.
 * Cross-season-type promotion is not attempted (conservative).
 */

import {
  type CurrentNflWeekRef,
  selectCurrentWeekContests,
  type WeekIdentity,
} from "./pickem-scoring";

// ---------------------------------------------------------------------------
// Pure time helpers (no fetch, no side effects)
// ---------------------------------------------------------------------------

/**
 * Returns the UTC instant that corresponds to the given civil time in
 * America/New_York, handling DST correctly via the Intl round-trip technique.
 */
export function etCivilToUTC(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
): Date {
  // Initial guess: UTC-5 (standard time). DST offset is corrected below.
  const guess = new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(guess).map(p => [p.type, p.value]),
  );
  const diffMs =
    ((hour - parseInt(parts.hour, 10)) * 60 +
      (minute - parseInt(parts.minute, 10))) *
    60_000;
  return new Date(guess.getTime() + diffMs);
}

/**
 * Returns the UTC instant of Tuesday 8 PM ET immediately PRECEDING the given
 * kickoff. If the kickoff itself falls on a Tuesday at or after 8 PM ET,
 * returns that same Tuesday's cutoff.
 *
 * Examples (DST active, ET = UTC-4):
 *   Thu 2026-09-18T00:15Z → Tue Sep 15 8 PM ET = 2026-09-16T00:00Z
 *   Thu 2026-09-10T00:20Z → Tue Sep  8 8 PM ET = 2026-09-09T00:00Z
 *
 * Examples (standard time, ET = UTC-5):
 *   Sun 2026-11-08T18:00Z → Tue Nov  3 8 PM ET = 2026-11-04T01:00Z
 */
export function tuesdayCutoffBeforeKickoff(kickoff: Date): Date {
  const wkdFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const kickoffWkd = weekdayIndex[wkdFmt.format(kickoff)] ?? 0;
  // daysSinceTue: 0 when kickoff IS Tuesday, 1 for Wednesday, etc.
  const daysSinceTue = (kickoffWkd - 2 + 7) % 7;

  // Get the ET calendar date of the kickoff
  const parts = Object.fromEntries(
    dateFmt.formatToParts(kickoff).map(p => [p.type, p.value]),
  );
  const etYear = parseInt(parts.year, 10);
  const etMonth = parseInt(parts.month, 10);
  const etDay = parseInt(parts.day, 10);

  // Walk back to Tuesday in ET calendar (pure UTC day arithmetic — no TZ confusion)
  const kickoffEtMidnightUtc = Date.UTC(etYear, etMonth - 1, etDay);
  const tuesdayEtMidnightUtc = kickoffEtMidnightUtc - daysSinceTue * 86_400_000;
  const t = new Date(tuesdayEtMidnightUtc);

  return etCivilToUTC(
    t.getUTCFullYear(),
    t.getUTCMonth() + 1,
    t.getUTCDate(),
    20,
    0,
  );
}

// ---------------------------------------------------------------------------
// Schedule-anchored selection (async — fetches candidate kickoffs)
// ---------------------------------------------------------------------------

/**
 * Callback injected by the hook to fetch a slate's first kickoff date.
 * Returns null on error or empty schedule (conservative fallback).
 * The hook passes fetchFirstKickoffFromApi; tests pass a stub.
 */
export type FetchFirstKickoff = (
  year: number,
  seasonType: number,
  weekNumber: number,
) => Promise<Date | null>;

/**
 * Default implementation backed by /api/week-games. Returns the earliest
 * kickoff across all games in the requested week, or null on any error.
 */
export async function fetchFirstKickoffFromApi(
  year: number,
  seasonType: number,
  weekNumber: number,
): Promise<Date | null> {
  try {
    const res = await fetch(
      `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
    );
    if (!res.ok) return null;
    const games = (await res.json()) as { kickoff?: string }[];
    const kickoffs = games
      .map(g => (g.kickoff ? new Date(g.kickoff).getTime() : NaN))
      .filter(t => Number.isFinite(t));
    if (kickoffs.length === 0) return null;
    return new Date(Math.min(...kickoffs));
  } catch {
    return null;
  }
}

/**
 * Resolves which contests to show under "This week" using the
 * schedule-anchored promotion rule (see module docblock).
 *
 * Falls back conservatively to selectCurrentWeekContests on any error,
 * missing schedule data, or when no owned entries qualify for promotion.
 */
export async function resolveThisWeekEntries<T extends WeekIdentity>(
  contests: T[],
  currentWeek: CurrentNflWeekRef,
  now: Date,
  fetchFirstKickoff: FetchFirstKickoff,
): Promise<T[]> {
  try {
    // Step 1: candidates strictly ahead in the same season type + year
    const candidates = contests.filter(
      c =>
        c.year === currentWeek.seasonYear &&
        c.seasonType === currentWeek.seasonType &&
        c.weekNumber > currentWeek.week,
    );

    if (candidates.length === 0) {
      return selectCurrentWeekContests(contests, currentWeek);
    }

    // Step 2: immediately upcoming only (minimum weekNumber)
    const minWeek = Math.min(...candidates.map(c => c.weekNumber));
    const upcomingCandidates = candidates.filter(c => c.weekNumber === minWeek);

    // Step 3: fetch the slate's first kickoff
    const firstKickoff = await fetchFirstKickoff(
      currentWeek.seasonYear,
      currentWeek.seasonType,
      minWeek,
    );

    if (firstKickoff === null) {
      return selectCurrentWeekContests(contests, currentWeek);
    }

    // Step 4-5: derive schedule-anchored cutoff and compare
    const cutoff = tuesdayCutoffBeforeKickoff(firstKickoff);

    if (now >= cutoff) {
      return upcomingCandidates;
    }

    return selectCurrentWeekContests(contests, currentWeek);
  } catch {
    return selectCurrentWeekContests(contests, currentWeek);
  }
}
