import { useQuery, useQueryClient } from "@tanstack/react-query";

import { BoxOwner, Contest, GameScore } from "@/components/contest/types";
import { invalidateContestCaches } from "@/lib/cache-utils";
import { queryKeys } from "@/lib/query-keys";

interface UseContestDataReturn {
  contest: Contest | null;
  gameScore: GameScore | null;
  boxOwners: BoxOwner[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refreshContestData: () => Promise<void>;
  refreshGameScores: () => Promise<void>;
}

export function useContestData(contestId: string): UseContestDataReturn {
  const queryClient = useQueryClient();

  // Main contest data query
  const contestQuery = useQuery({
    queryKey: queryKeys.contest(contestId),
    queryFn: async () => {
      const response = await fetch(`/api/contest/${contestId}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("Failed to fetch contest");
      return response.json();
    },
    select: (data) => ({
      contest: {
        id: parseInt(data.id),
        gameId: parseInt(data.gameId),
        creator: data.creator,
        rows: data.rows,
        cols: data.cols,
        boxCost: {
          currency: data.boxCost.currency,
          amount: parseInt(data.boxCost.amount),
        },
        boxesCanBeClaimed: data.boxesCanBeClaimed,
        payoutsPaid: {
          totalPayoutsMade: data.payoutsPaid.totalPayoutsMade,
          totalAmountPaid: parseInt(data.payoutsPaid.totalAmountPaid),
        },
        totalRewards: parseInt(data.totalRewards),
        boxesClaimed: parseInt(data.boxesClaimed),
        randomValuesSet: data.randomValuesSet,
        title: data.title,
        description: data.description,
        payoutStrategy: data.payoutStrategy,
        payoutTransactionHash: data.payoutTransactionHash || null,
      } as Contest,
      boxOwners: (data.boxes || []) as BoxOwner[],
      gameId: data.gameId,
    }),
  });

  // Game scores query (separate for independent refresh)
  const gameScoresQuery = useQuery({
    queryKey: queryKeys.gameScores(contestQuery.data?.gameId?.toString() ?? ""),
    queryFn: async () => {
      const response = await fetch(`/api/games/${contestQuery.data?.gameId}/scores`);
      if (!response.ok) return null;
      return response.json() as Promise<GameScore>;
    },
    enabled: !!contestQuery.data?.gameId,
  });

  // Refresh that invalidates both Redis AND React Query caches
  const refreshContestData = async () => {
    await invalidateContestCaches(contestId, queryClient);
  };

  const refreshGameScores = async () => {
    const gameId = contestQuery.data?.gameId;
    if (!gameId) return;

    // Hit the refresh endpoint to update server-side data
    await fetch(`/api/games/${gameId}/scores/refresh`, { method: "POST" });

    // Invalidate React Query cache
    await queryClient.invalidateQueries({
      queryKey: queryKeys.gameScores(gameId.toString()),
    });
  };

  return {
    contest: contestQuery.data?.contest ?? null,
    gameScore: gameScoresQuery.data ?? null,
    boxOwners: contestQuery.data?.boxOwners ?? [],
    isLoading: contestQuery.isLoading,
    isRefreshing: contestQuery.isFetching || gameScoresQuery.isFetching,
    error: contestQuery.error as Error | null,
    refreshContestData,
    refreshGameScores,
  };
}

