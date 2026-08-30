export type PickResult =
  | "correct"
  | "wrong"
  | "tie"
  | "live-winning"
  | "live-losing"
  | "pending";

export interface ScoredGame {
  gameId: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  completed?: boolean;
}

export interface RankableEntry {
  tokenId: number;
  picks: number[];
  tiebreakerPoints: number;
}

export interface RankedEntry {
  tokenId: number;
  correctPicks: number;
  scoredGames: number;
  rank: number;
}

export function isGameComplete(status?: string, completed?: boolean): boolean {
  if (completed) return true;
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("final") ||
    normalized === "status_final" ||
    normalized === "status_full_time"
  );
}

export function isGameInProgress(
  status?: string,
  homeScore?: number,
  awayScore?: number,
): boolean {
  if (isGameComplete(status, undefined)) return false;

  const normalized = (status ?? "").toLowerCase();
  if (
    normalized.includes("in_progress") ||
    normalized.includes("in progress") ||
    normalized.includes("halftime") ||
    normalized.includes("end_period") ||
    normalized.includes("end period") ||
    normalized.includes("delay")
  ) {
    return true;
  }

  return (homeScore ?? 0) > 0 || (awayScore ?? 0) > 0;
}

export function getCurrentWinner(
  homeScore?: number,
  awayScore?: number,
): 0 | 1 | null {
  if (homeScore === undefined || awayScore === undefined) {
    return null;
  }
  if (homeScore > awayScore) return 1;
  if (awayScore > homeScore) return 0;
  return null;
}

export function getPickResult(game: ScoredGame, pick: number): PickResult {
  const winner = getCurrentWinner(game.homeScore, game.awayScore);
  const complete = isGameComplete(game.status, game.completed);
  const inProgress = isGameInProgress(
    game.status,
    game.homeScore,
    game.awayScore,
  );

  if (complete) {
    if (winner === null) return "tie";
    return pick === winner ? "correct" : "wrong";
  }

  if (inProgress) {
    if (winner === null) return "pending";
    return pick === winner ? "live-winning" : "live-losing";
  }

  return "pending";
}

export function countLiveScore(
  picks: number[],
  gameIds: string[],
  gamesById: Map<string, ScoredGame>,
): { correctPicks: number; scoredGames: number } {
  let correctPicks = 0;
  let scoredGames = 0;

  for (let index = 0; index < gameIds.length; index++) {
    const game = gamesById.get(gameIds[index]);
    if (!game) continue;

    const hasStarted =
      isGameComplete(game.status, game.completed) ||
      isGameInProgress(game.status, game.homeScore, game.awayScore);
    if (!hasStarted) continue;

    scoredGames += 1;
    const winner = getCurrentWinner(game.homeScore, game.awayScore);
    if (winner !== null && picks[index] === winner) {
      correctPicks += 1;
    }
  }

  return { correctPicks, scoredGames };
}

export function rankEntries(
  entries: RankableEntry[],
  gameIds: string[],
  games: ScoredGame[],
  tiebreakerGameId?: string,
): RankedEntry[] {
  const gamesById = new Map(games.map(game => [game.gameId, game]));
  const tiebreakerGame = gamesById.get(
    tiebreakerGameId || gameIds[gameIds.length - 1] || "",
  );
  const actualTiebreakerTotal =
    tiebreakerGame &&
    tiebreakerGame.homeScore !== undefined &&
    tiebreakerGame.awayScore !== undefined
      ? tiebreakerGame.homeScore + tiebreakerGame.awayScore
      : 0;

  const scored = entries.map(entry => {
    const { correctPicks, scoredGames } = countLiveScore(
      entry.picks,
      gameIds,
      gamesById,
    );
    return {
      tokenId: entry.tokenId,
      correctPicks,
      scoredGames,
      tiebreakerPoints: entry.tiebreakerPoints,
    };
  });

  scored.sort((a, b) => {
    if (b.correctPicks !== a.correctPicks) {
      return b.correctPicks - a.correctPicks;
    }
    if (actualTiebreakerTotal > 0) {
      const aDiff = Math.abs(a.tiebreakerPoints - actualTiebreakerTotal);
      const bDiff = Math.abs(b.tiebreakerPoints - actualTiebreakerTotal);
      if (aDiff !== bDiff) return aDiff - bDiff;
    }
    return a.tokenId - b.tokenId;
  });

  return scored.map((entry, index) => ({
    tokenId: entry.tokenId,
    correctPicks: entry.correctPicks,
    scoredGames: entry.scoredGames,
    rank: index + 1,
  }));
}

export function formatPlace(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

export const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

export interface WeekIdentity {
  year: number;
  seasonType: number;
  weekNumber: number;
}

export interface CurrentNflWeekRef {
  seasonYear: number;
  seasonType: number;
  week: number;
}

function sameCalendarYear(
  contest: WeekIdentity,
  current: CurrentNflWeekRef,
): boolean {
  return contest.year === current.seasonYear;
}

export function selectCurrentWeekContests<T extends WeekIdentity>(
  contests: T[],
  current: CurrentNflWeekRef,
): T[] {
  const sameYear = contests.filter(contest =>
    sameCalendarYear(contest, current),
  );

  const exact = sameYear.filter(
    contest =>
      contest.seasonType === current.seasonType &&
      contest.weekNumber === current.week,
  );
  if (exact.length > 0) return exact;

  const previousSameType = sameYear.filter(
    contest =>
      contest.seasonType === current.seasonType &&
      contest.weekNumber === current.week - 1,
  );
  if (previousSameType.length > 0) return previousSameType;

  // ESPN can roll from preseason -> regular or regular -> postseason
  // while last week's games are still relevant.
  if (current.week === 1 && current.seasonType > 1) {
    const previousType = current.seasonType - 1;
    const previousTypeContests = sameYear.filter(
      contest => contest.seasonType === previousType,
    );
    if (previousTypeContests.length === 0) return [];
    const latestWeek = Math.max(
      ...previousTypeContests.map(contest => contest.weekNumber),
    );
    return previousTypeContests.filter(
      contest => contest.weekNumber === latestWeek,
    );
  }

  return [];
}
