/**
 * Finds the contest the same creator ran for the most recent earlier week,
 * so a weekly series (e.g. bankrball.eth's featured contest) links back to
 * last week's game.
 */

export interface ContestWeekRef {
  id: number;
  creator: string;
  year: number;
  seasonType: number;
  weekNumber: number;
}

// Contest ids scanned below the current one. Several contests are created
// per week, so this comfortably covers the previous week.
export const PREVIOUS_WEEK_SCAN = 30;

const weekKey = (c: ContestWeekRef) =>
  c.year * 10_000 + c.seasonType * 100 + c.weekNumber;

export function findPreviousWeekContest(
  current: ContestWeekRef,
  candidates: ContestWeekRef[],
): ContestWeekRef | null {
  const creator = current.creator.toLowerCase();
  const currentKey = weekKey(current);
  let best: ContestWeekRef | null = null;
  for (const c of candidates) {
    if (c.id === current.id || c.creator.toLowerCase() !== creator) continue;
    const key = weekKey(c);
    if (key >= currentKey) continue;
    if (
      !best ||
      key > weekKey(best) ||
      (key === weekKey(best) && c.id > best.id)
    ) {
      best = c;
    }
  }
  return best;
}
