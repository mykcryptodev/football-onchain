export interface Matchup {
  gameId: string;
  away: string;
  home: string;
  kickoff: string;
  awayScore?: number;
  homeScore?: number;
  completed: boolean;
}

export function pickTemplate(games: Matchup[]): string {
  return games.map((g, i) => `${i + 1}. ${g.away} vs ${g.home}: `).join("\n");
}

/** Numbering always refers to the immutable contest gameIds order. */
export function parsePicks(
  text: string,
  games: Matchup[],
  random: () => number = Math.random,
) {
  const picks: (0 | 1 | null)[] = games.map(() => null);
  const seen = new Set<number>();
  let fillRandom = false;
  for (const line of text
    .trim()
    .split(/\r?\n/)
    .filter(l => l.trim())) {
    if (/^fill (?:in )?the rest randomly[.!]?$/i.test(line.trim())) {
      fillRandom = true;
      continue;
    }
    const match = line.trim().match(/^(\d+)[.)]\s*(.*)$/);
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
