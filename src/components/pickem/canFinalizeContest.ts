/**
 * Contest finalization (`updateContestResults`) reverts unless the oracle has
 * already stored this week's NFL results. Hide the action until that is true.
 */
export function canFinalizeContest(
  gamesFinalized: boolean | undefined,
  weekResultsFinalized: boolean | undefined,
): boolean {
  return !gamesFinalized && weekResultsFinalized === true;
}
