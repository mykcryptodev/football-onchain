export interface Matchup {
  gameId: string;
  away: string;
  home: string;
  kickoff: string;
  awayScore?: number;
  homeScore?: number;
  completed: boolean;
}

/** The tiebreaker line is appended to the same copy-paste block so a single
 * reply carries both picks and tiebreaker — never a separate question. */
export function pickTemplate(games: Matchup[], tiebreaker: Matchup): string {
  const gameLines = games.map((g, i) => `${i + 1}. ${g.away} vs ${g.home}: `);
  return [
    ...gameLines,
    `Tiebreaker (combined points, ${tiebreaker.away} vs ${tiebreaker.home}): `,
  ].join("\n");
}

const TIEBREAKER_LINE = /^tiebreaker\b/i;

/** Numbering always refers to the immutable contest gameIds order. The
 * tiebreaker line (see `pickTemplate`) is parsed out of the same text —
 * it is never a separate message the caller has to track across turns. */
export function parsePicks(
  text: string,
  games: Matchup[],
  random: () => number = Math.random,
) {
  const picks: (0 | 1 | null)[] = games.map(() => null);
  const seen = new Set<number>();
  let fillRandom = false;
  let tiebreakerPoints: number | null = null;
  for (const line of text
    .trim()
    .split(/\r?\n/)
    .filter(l => l.trim())) {
    const trimmed = line.trim();
    if (/^fill (?:in )?the rest randomly[.!]?$/i.test(trimmed)) {
      fillRandom = true;
      continue;
    }
    if (TIEBREAKER_LINE.test(trimmed)) {
      const digits = trimmed.match(/(\d+)\s*$/);
      if (digits) {
        const value = Number(digits[1]);
        if (!Number.isSafeInteger(value) || value < 0)
          throw new Error("Tiebreaker must be a nonnegative whole number.");
        tiebreakerPoints = value;
      }
      continue;
    }
    const match = trimmed.match(/^(\d+)[.)]\s*(.*)$/);
    if (!match)
      throw new Error(
        `Use numbered picks, e.g. 1. NE. Unrecognized line: ${line}`,
      );
    const index = Number(match[1]) - 1;
    if (!games[index] || seen.has(index))
      throw new Error("Invalid or duplicate game number.");
    seen.add(index);
    const game = games[index];
    const body = match[2].trim().toUpperCase();
    const parts = body.split(":");
    if (parts.length > 2) throw new Error("Invalid matchup line.");
    if (
      parts.length === 2 &&
      parts[0].trim() !== `${game.away} VS ${game.home}`.toUpperCase()
    )
      throw new Error(
        `Game ${index + 1} is ${game.away} vs ${game.home}. Refresh the template.`,
      );
    const team = parts.at(-1)!.trim();
    if (!team) continue;
    if (team !== game.away.toUpperCase() && team !== game.home.toUpperCase())
      throw new Error(
        `Choose ${game.away} or ${game.home} for game ${index + 1}.`,
      );
    picks[index] = team === game.home.toUpperCase() ? 1 : 0;
  }
  const randomized: number[] = [];
  if (fillRandom)
    picks.forEach((pick, i) => {
      if (pick === null) {
        picks[i] = random() < 0.5 ? 0 : 1;
        randomized.push(i + 1);
      }
    });
  return {
    picks,
    randomized,
    missing: picks.flatMap((p, i) => (p === null ? [i + 1] : [])),
    // null means the tiebreaker line was blank (or absent) — never guess a
    // value here; the caller must ask for it explicitly, same as a missing
    // game pick.
    tiebreakerPoints,
  };
}

export function settlementStep(state: {
  payoutComplete: boolean;
  hasClaimedPrize: boolean;
  submissionDeadline: bigint;
  totalEntries: bigint;
  oracleFinalized: boolean;
  gamesFinalized: boolean;
  slateMatches: boolean;
  unscored: readonly bigint[];
  now: bigint;
  payoutDeadline: bigint;
}) {
  if (!state.slateMatches) return "blocked-slate";
  if (state.totalEntries === BigInt(0)) return "empty";
  if ((state.payoutComplete || state.hasClaimedPrize) && state.unscored.length)
    return "blocked-incomplete-payout";
  if (state.payoutComplete) return "complete";
  if (state.now < state.submissionDeadline) return "wait-entries";
  if (!state.oracleFinalized) return "oracle";
  if (!state.gamesFinalized) return "finalize";
  if (state.unscored.length) return "score";
  if (state.now < state.payoutDeadline) return "wait";
  return "pay";
}
