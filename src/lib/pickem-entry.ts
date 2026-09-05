/** Keep the number passed to the contract an exact, non-negative integer. */
export function isValidTiebreaker(value: string): boolean {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
}
