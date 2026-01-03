import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

interface Game {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions: {
    competitors: Array<{
      team: {
        name: string;
        abbreviation: string;
      };
      homeAway: string;
    }>;
  } | null;
}

interface GamesResponse {
  games: Game[];
  week: number;
  season: { year: number; type: number };
}

interface UseNFLGamesReturn {
  games: Game[];
  isLoading: boolean;
  error: Error | null;
}

export function useNFLGames(seasonType: string, week: string): UseNFLGamesReturn {
  const query = useQuery({
    queryKey: queryKeys.nflGames(seasonType, week),
    queryFn: async () => {
      const response = await fetch(`/api/games?season=${seasonType}&week=${week}`);
      if (!response.ok) throw new Error("Failed to fetch games");
      return response.json() as Promise<GamesResponse>;
    },
    enabled: !!seasonType && !!week,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    games: query.data?.games ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

