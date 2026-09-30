/**
 * Finds the contests the same creator ran for the nearest earlier and later
 * weeks, so a weekly series (e.g. bankrball.eth's featured contest) links to
 * last week's and next week's game.
 */

export interface ContestWeekRef {
  id: number;
  creator: string;
  year: number;
  seasonType: number;
  weekNumber: number;
}

// Contest ids scanned on each side of the current one. Several contests are
// created per week, so this comfortably covers the adjacent weeks.
export const ADJACENT_WEEK_SCAN = 30;

const weekKey = (c: ContestWeekRef) =>
  c.year * 10_000 + c.seasonType * 100 + c.weekNumber;

export function findAdjacentWeekContests(
  current: ContestWeekRef,
  candidates: ContestWeekRef[],
): { previous: ContestWeekRef | null; next: ContestWeekRef | null } {
  const creator = current.creator.toLowerCase();
  const currentKey = weekKey(current);
  let previous: ContestWeekRef | null = null;
  let next: ContestWeekRef | null = null;
  for (const c of candidates) {
    if (c.id === current.id || c.creator.toLowerCase() !== creator) continue;
    const key = weekKey(c);
    if (key < currentKey) {
      const best = previous ? weekKey(previous) : -1;
      if (key > best || (key === best && c.id > previous!.id)) previous = c;
    } else if (key > currentKey) {
      const best = next ? weekKey(next) : Infinity;
      if (key < best || (key === best && c.id > next!.id)) next = c;
    }
  }
  return { previous, next };
}
