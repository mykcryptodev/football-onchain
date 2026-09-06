// Matches Pickem.claimPrize, including integer rounding at each division.
export function calculateEntryPrize(
  pool: bigint,
  fee: bigint,
  denominator: bigint,
  percentages: readonly bigint[],
  winnerIndex: number,
) {
  if (winnerIndex < 0 || winnerIndex >= percentages.length || denominator <= 0n)
    return 0n;
  return (
    ((pool - (pool * fee) / denominator) * percentages[winnerIndex]) /
    denominator
  );
}
