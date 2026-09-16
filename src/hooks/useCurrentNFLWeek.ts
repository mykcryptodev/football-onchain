"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

export interface CurrentNFLWeek {
  week: number;
  seasonType: number;
  seasonYear: number;
}

interface CurrentWeekApiResponse {
  week: number;
  season: number;
  seasonYear: number;
}

interface UseCurrentNFLWeekReturn {
  currentWeek: CurrentNFLWeek | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCurrentNFLWeek(): UseCurrentNFLWeekReturn {
  const query = useQuery({
    queryKey: queryKeys.currentNflWeek(),
    queryFn: async (): Promise<CurrentNFLWeek> => {
      const response = await fetch("/api/games/current");
      if (!response.ok) {
        throw new Error("Failed to fetch the current NFL week");
      }
      const data = (await response.json()) as CurrentWeekApiResponse;
      return {
        week: data.week,
        seasonType: data.season,
        seasonYear: data.seasonYear,
      };
    },
    // Refresh every 5 minutes so the week number tracks ESPN after a rollover
    // without requiring a page reload. The server route now caches for the same
    // interval, so the network round-trip is cheap.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    currentWeek: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
