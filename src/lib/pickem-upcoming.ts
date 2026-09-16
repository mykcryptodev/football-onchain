/**
 * Conditional "This week" promotion.
 *
 * Starting Tuesday 8 PM America/New_York the "This week" tab should foreground
 * entries for the IMMEDIATELY upcoming slate — but only when the wallet
 * actually owns entries for it. If not, fall back to the existing
 * selectCurrentWeekContests behaviour.
 *
 * The "upcoming slate" is the week that follows the ESPN-reported current week.
 * We do NOT manufacture a week number from the calendar; we derive it solely
 * from what the schedule data already tells us and the contest metadata already
 * held by the hook.
 *
 * Constraints the implementation keeps:
 *   - Purely time + ownership logic; no scoring, prize, or settlement fields.
 *   - Does not change "All weeks" or numeric contest scope.
 *   - Season boundaries: only promote within the same season type and year;
 *     cross-type promotion (e.g. preseason → regular) is not attempted here
 *     because the upcoming slate identity for that case depends on which type
 *     ESPN reports next, information we do not reliably have before it switches.
 *   - Conservative: if the next-week identity cannot be established, fall back.
 */

import {
  type CurrentNflWeekRef,
  selectCurrentWeekContests,
  type WeekIdentity,
} from "./pickem-scoring";

/** Cutoff: Tuesday at this hour in America/New_York (24h). */
const CUTOFF_HOUR_ET = 20; // 8 PM ET

/**
 * Returns true when `now` is on or after the Tuesday-8pm-ET cutoff in the
 * same week as the NFL schedule reference.  Handles DST transitions correctly
 * because Intl always returns the civil hour in the named zone.
 */
export function isPastTuesdayCutoff(now: Date): boolean {
  // getDay()-equivalent in ET: 0=Sun … 2=Tue … 6=Sat
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(now);
  // Numerically compare weekday position (0=Sunday)
  const weekdayOrder = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayIndex = weekdayOrder.indexOf(dayStr);
  // If it's before Tuesday entirely, not past cutoff
  if (dayIndex < 2) return false;
  // If it's Wednesday-Saturday, always past cutoff
  if (dayIndex > 2) return true;
  // It's Tuesday — check the hour
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = parseInt(hourStr, 10);
  return hour >= CUTOFF_HOUR_ET;
}

/**
 * The immediately upcoming week, derived purely from what ESPN already reports
 * and contests already in the wallet.  Returns null when the next-week identity
 * cannot be safely established.
 *
 * Rules:
 *   - Only works within the same season type and year.
 *   - Does not wrap from Week 18 into postseason (that requires ESPN to already
 *     report the new type — at that point the hook's currentWeek will switch,
 *     making this moot).
 *   - Does not synthesise a Week 19.
 */
export function nextWeekRef(
  current: CurrentNflWeekRef,
): CurrentNflWeekRef | null {
  // Postseason week numbering isn't a simple +1; conservative bail.
  // Regular season goes 1–18. Preseason 1–4.
  const MAX_WEEK: Record<number, number> = { 1: 4, 2: 18, 3: 5 };
  const max = MAX_WEEK[current.seasonType] ?? 18;
  if (current.week >= max) return null;
  return {
    seasonYear: current.seasonYear,
    seasonType: current.seasonType,
    week: current.week + 1,
  };
}

/**
 * Selects the entries to show under "This week" given the conditional
 * promotion rule.
 *
 * Returns the upcoming-week entries when:
 *   1. `now` is past the Tuesday-8pm-ET cutoff.
 *   2. The next-week ref can be derived.
 *   3. The wallet owns at least one entry for that upcoming week.
 *
 * Otherwise returns `selectCurrentWeekContests(contests, current)`.
 *
 * `isLoading` should be true during data fetches; returns [] and does not
 * fall through to the selector so callers can distinguish loading from empty.
 */
export function resolveThisWeekEntries<T extends WeekIdentity>(
  contests: T[],
  current: CurrentNflWeekRef | null,
  now: Date,
  isLoading: boolean,
): T[] {
  if (isLoading || !current) return [];

  if (isPastTuesdayCutoff(now)) {
    const upcoming = nextWeekRef(current);
    if (upcoming) {
      const upcomingEntries = contests.filter(
        c =>
          c.year === upcoming.seasonYear &&
          c.seasonType === upcoming.seasonType &&
          c.weekNumber === upcoming.week,
      );
      if (upcomingEntries.length > 0) return upcomingEntries;
    }
  }

  return selectCurrentWeekContests(contests, current);
}
