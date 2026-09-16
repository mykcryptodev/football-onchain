import {
  type CurrentNflWeekRef,
  selectCurrentWeekContests,
  type WeekIdentity,
} from "./pickem-scoring";

export interface SlateGame {
  kickoff: string;
  completed?: boolean;
}

type LoadSchedule = (
  year: number,
  seasonType: number,
  week: number,
) => Promise<SlateGame[]>;

// Compare civil dates in Eastern time, rather than a fixed UTC offset.
function easternCivilTime(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
}

/** Tuesday 8 PM ET preceding this slate's first kickoff; never resets Sunday. */
export function isPastSlateCutoff(now: Date, games: SlateGame[]): boolean {
  const times = games.map(game => Date.parse(game.kickoff));
  if (
    !times.length ||
    times.some(time => !Number.isFinite(time)) ||
    !Number.isFinite(now.getTime())
  )
    return false;
  const kickoff = easternCivilTime(new Date(Math.min(...times)));
  const civil = new Date(kickoff);
  const daysSinceTuesday = (civil.getUTCDay() + 5) % 7;
  let cutoff = Date.UTC(
    civil.getUTCFullYear(),
    civil.getUTCMonth(),
    civil.getUTCDate() - daysSinceTuesday,
    20,
  );
  // An unusual Tuesday kickoff before 8 PM belongs to the preceding cutoff.
  if (cutoff > kickoff) cutoff -= 7 * 86400000;
  return easternCivilTime(now) >= cutoff;
}

export function nextWeekRef(
  current: CurrentNflWeekRef,
): CurrentNflWeekRef | null {
  const maxWeek: Record<number, number> = { 1: 4, 2: 18, 3: 5 };
  const max = maxWeek[current.seasonType];
  // Cross-season transitions remain with the existing ESPN-based selector.
  if (!max || current.week < 1 || current.week >= max) return null;
  return { ...current, week: current.week + 1 };
}

/** Advance only a fully finished ESPN slate to its immediate successor.
 * Fresh ESPN data already selects the right week through the fallback.
 * Missing or failed schedules preserve the existing selection.
 */
export async function resolveThisWeekEntries<T extends WeekIdentity>(
  contests: T[],
  current: CurrentNflWeekRef,
  now: Date,
  loadSchedule: LoadSchedule,
): Promise<T[]> {
  const fallback = selectCurrentWeekContests(contests, current);
  const next = nextWeekRef(current);
  if (!next) return fallback;
  const candidates = contests.filter(
    contest =>
      contest.year === next.seasonYear &&
      contest.seasonType === next.seasonType &&
      contest.weekNumber === next.week,
  );
  if (!candidates.length) return fallback;
  try {
    const currentGames = await loadSchedule(
      current.seasonYear,
      current.seasonType,
      current.week,
    );
    if (
      !currentGames.length ||
      !currentGames.every(game => game.completed === true)
    )
      return fallback;
    const nextGames = await loadSchedule(
      next.seasonYear,
      next.seasonType,
      next.week,
    );
    return isPastSlateCutoff(now, nextGames) ? candidates : fallback;
  } catch {
    return fallback;
  }
}
