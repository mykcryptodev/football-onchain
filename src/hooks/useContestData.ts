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

interface ContestQueryData {
  contest: Contest;
  boxOwners: BoxOwner[];
  gameId: number;
}

interface ContestApiResponse {
  id: string;
  gameId: string;
  creator: string;
  rows: number[];
  cols: number[];
  boxCost: {
    currency: string;
    amount: string | number;
  };
  boxesCanBeClaimed: boolean;
  payoutsPaid: {
    totalPayoutsMade: number;
    totalAmountPaid: string | number;
  };
  totalRewards: string | number;
  boxesClaimed: string | number;
  randomValuesSet: boolean;
  title: string;
  description: string;
  payoutStrategy: string;
  payoutTransactionHash?: string | null;
  boxes?: BoxOwner[];
}

export function useContestData(contestId: string): UseContestDataReturn {
  const queryClient = useQueryClient();
  const contestPollIntervalMs = 15 * 1000;
  const gameScorePollIntervalMs = 12 * 1000;

  // Main contest data query
  const contestQuery = useQuery<ContestApiResponse, Error, ContestQueryData>({
    queryKey: queryKeys.contest(contestId),
    queryFn: async () => {
      const response = await fetch(
        `/api/contest/${contestId}?t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch contest");
      return response.json();
    },
    select: data => {
      // Convert crypto amounts using BigInt to preserve precision for large values
      // Then convert to number for backward compatibility with existing types
      // Note: Very large values (> Number.MAX_SAFE_INTEGER) may still lose precision
      // but this is better than parseInt which fails earlier
      const boxCostAmount =
        typeof data.boxCost.amount === "string"
          ? data.boxCost.amount
          : String(data.boxCost.amount);

      const totalAmountPaid =
        typeof data.payoutsPaid.totalAmountPaid === "string"
          ? Number(BigInt(data.payoutsPaid.totalAmountPaid))
          : data.payoutsPaid.totalAmountPaid;

      const totalRewards =
        typeof data.totalRewards === "string"
          ? Number(BigInt(data.totalRewards))
          : data.totalRewards;

      const boxesClaimed =
        typeof data.boxesClaimed === "string"
          ? Number(BigInt(data.boxesClaimed))
          : data.boxesClaimed;

      return {
        contest: {
          id: parseInt(data.id),
          gameId: parseInt(data.gameId),
          creator: data.creator,
          rows: data.rows,
          cols: data.cols,
          boxCost: {
            currency: data.boxCost.currency,
            amount: boxCostAmount, // Keep as string to preserve precision
          },
          boxesCanBeClaimed: data.boxesCanBeClaimed,
          payoutsPaid: {
            totalPayoutsMade: data.payoutsPaid.totalPayoutsMade,
            totalAmountPaid,
          },
          totalRewards,
          boxesClaimed,
          randomValuesSet: data.randomValuesSet,
          title: data.title,
          description: data.description,
          payoutStrategy: data.payoutStrategy,
          payoutTransactionHash: data.payoutTransactionHash || null,
        } as Contest,
        boxOwners: (data.boxes || []) as BoxOwner[],
        gameId: data.gameId,
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      const contest = query.state.data?.contest;

      if (!contest) {
        return contestPollIntervalMs;
      }

      const isContestActive =
        contest.boxesCanBeClaimed ||
        contest.boxesClaimed < 100 ||
        !contest.randomValuesSet ||
        !contest.payoutTransactionHash;

      return isContestActive ? contestPollIntervalMs : false;
    },
  });

  // Game scores query (separate for independent refresh)
  const gameScoresQuery = useQuery({
    queryKey: queryKeys.gameScores(contestQuery.data?.gameId?.toString() ?? ""),
    queryFn: async () => {
      const response = await fetch(
        `/api/games/${contestQuery.data?.gameId}/scores`,
      );
      if (!response.ok) return null;
      return response.json() as Promise<GameScore>;
    },
    enabled: !!contestQuery.data?.gameId,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: query => {
      if (!contestQuery.data?.gameId) {
        return false;
      }

      const data = query.state.data as GameScore | null | undefined;

      if (!data) {
        return gameScorePollIntervalMs;
      }

      if (data.requestInProgress) {
        return 5 * 1000;
      }

      if (data.qComplete >= 4) {
        return false;
      }

      return gameScorePollIntervalMs;
    },
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
