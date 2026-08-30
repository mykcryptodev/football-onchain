"use client";

import { useQuery } from "@tanstack/react-query";

import type { NflWeek } from "@/lib/pickem-choices";
import { queryKeys } from "@/lib/query-keys";

interface CurrentWeekResponse {
  week: number;
  season: number;
  seasonYear: number;
}

interface UseCurrentNflWeekReturn {
  currentWeek: NflWeek | null;
  isLoading: boolean;
}

export function useCurrentNflWeek(): UseCurrentNflWeekReturn {
  const query = useQuery({
    queryKey: queryKeys.currentNflWeek(),
    queryFn: async (): Promise<NflWeek> => {
      const response = await fetch("/api/games/current");
      if (!response.ok) {
        throw new Error("Failed to fetch current NFL week");
      }
      const data = (await response.json()) as CurrentWeekResponse;
      return {
        year: data.seasonYear,
        seasonType: data.season,
        weekNumber: data.week,
      };
    },
    staleTime: 60 * 60 * 1000,
  });

  return {
    currentWeek: query.data ?? null,
    isLoading: query.isLoading,
  };
}
