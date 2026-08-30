export interface PickemChoiceGame {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  kickoff: string;
  status?: string;
}

export type PickemChoiceStatus = "correct" | "wrong" | "pending";

export interface PairedPickemChoice {
  game: PickemChoiceGame;
  pick: number;
  status: PickemChoiceStatus;
}

/** 0 = away, 1 = home. Null when the game is not a completed non-tie. */
export function getPickemWinner(game: PickemChoiceGame): 0 | 1 | null {
  if (
    game.status !== "STATUS_FINAL" ||
    game.homeScore === undefined ||
    game.awayScore === undefined
  ) {
    return null;
  }

  if (game.homeScore > game.awayScore) return 1;
  if (game.awayScore > game.homeScore) return 0;
  return null;
}

export function pairPicksWithGames(
  contestGameIds: string[],
  picks: number[],
  games: PickemChoiceGame[],
): PairedPickemChoice[] {
  const pickByGameId = new Map(
    contestGameIds.map((gameId, index) => [gameId, picks[index] ?? -1]),
  );

  return [...games]
    .filter(game => pickByGameId.has(game.gameId))
    .sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
    )
    .map(game => {
      const pick = pickByGameId.get(game.gameId) ?? -1;
      const winner = getPickemWinner(game);
      let status: PickemChoiceStatus = "pending";
      if (winner !== null && pick !== -1) {
        status = pick === winner ? "correct" : "wrong";
      }

      return { game, pick, status };
    });
}
