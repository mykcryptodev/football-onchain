/**
 * Contest IDs hidden from public discovery surfaces.
 *
 * Keep direct contest URLs and owned-entry history available so hiding a
 * contest never makes an onchain entry inaccessible.
 */
export const hiddenPickemContestIds: readonly number[] = [];

export function isContestIdHidden(
  contestId: number | bigint,
  hiddenIds: readonly number[],
): boolean {
  return hiddenIds.includes(Number(contestId));
}

export function isPickemContestHidden(contestId: number | bigint): boolean {
  return isContestIdHidden(contestId, hiddenPickemContestIds);
}

export function visibleContests<T extends { id: number }>(
  contests: readonly T[],
  hiddenIds: readonly number[],
): T[] {
  return contests.filter(contest => !isContestIdHidden(contest.id, hiddenIds));
}

export function visiblePickemContests<T extends { id: number }>(
  contests: readonly T[],
): T[] {
  return visibleContests(contests, hiddenPickemContestIds);
}
