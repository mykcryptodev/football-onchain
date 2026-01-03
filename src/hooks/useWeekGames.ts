import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string;
  homeLogo?: string;
  awayLogo?: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  odds?: {
    details?: string;
    overUnder?: number;
    spread?: number;
    homeTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
    awayTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
  };
}

interface UseWeekGamesParams {
  year: number;
  seasonType: number;
  weekNumber: number;
  gameIds?: string[];
}

interface UseWeekGamesReturn {
  games: GameInfo[];
  isLoading: boolean;
  error: Error | null;
}

export function useWeekGames(params: UseWeekGamesParams): UseWeekGamesReturn {
  const query = useQuery({
    queryKey: queryKeys.weekGames(params.year, params.seasonType, params.weekNumber),
    queryFn: async () => {
      const response = await fetch(
        `/api/week-games?year=${params.year}&seasonType=${params.seasonType}&week=${params.weekNumber}`,
      );
      if (!response.ok) throw new Error("Failed to fetch games");
      const allGames = await response.json();

      // Filter to contest games if gameIds provided
      if (params.gameIds) {
        return allGames
          .filter((g: GameInfo) => params.gameIds!.includes(g.gameId))
          .sort((a: GameInfo, b: GameInfo) => a.gameId.localeCompare(b.gameId));
      }
      return allGames;
    },
    staleTime: 5 * 60 * 1000, // Games data fresh for 5 minutes
  });

  return {
    games: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

