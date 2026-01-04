import { useQuery } from "@tanstack/react-query";

import type { ContestListItem } from "@/app/api/contests/route";
import { queryKeys } from "@/lib/query-keys";

interface UseBoxesContestsReturn {
  contests: ContestListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBoxesContests(): UseBoxesContestsReturn {
  const query = useQuery({
    queryKey: queryKeys.boxesContests(),
    queryFn: async () => {
      const response = await fetch("/api/contests");
      if (!response.ok) {
        throw new Error("Failed to fetch contests");
      }
      return response.json() as Promise<ContestListItem[]>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    contests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

