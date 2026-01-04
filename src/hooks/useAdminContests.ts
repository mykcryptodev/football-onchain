import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { usePickemContract } from "./usePickemContract";

export interface ContestInfo {
  id: number;
  seasonType: number;
  weekNumber: number;
  year: number;
  currency: string;
  totalPrizePool: bigint;
  totalEntries: number;
  gamesFinalized: boolean;
  payoutComplete: boolean;
  payoutDeadline: number;
}

interface UseAdminContestsReturn {
  contests: ContestInfo[];
  isLoading: boolean;
  error: Error | null;
  distributePrizes: (contestId: number) => void;
  isDistributing: (contestId: number) => boolean;
  distributeAll: () => Promise<void>;
}

export function useAdminContests(): UseAdminContestsReturn {
  const queryClient = useQueryClient();
  const { getContest, getNextContestId, claimAllPrizes } = usePickemContract();

  const query = useQuery({
    queryKey: queryKeys.adminContests(),
    queryFn: async () => {
      const nextId = await getNextContestId();
      const contests = await Promise.all(
        Array.from({ length: nextId }, (_, i) => getContest(i)),
      );
      return contests
        .map((c, i) => ({
          id: i,
          seasonType: Number(c.seasonType),
          weekNumber: Number(c.weekNumber),
          year: Number(c.year),
          currency: c.currency,
          totalPrizePool: c.totalPrizePool,
          totalEntries: Number(c.totalEntries),
          gamesFinalized: c.gamesFinalized,
          payoutComplete: c.payoutComplete,
          payoutDeadline: Number(c.payoutDeadline),
        }))
        .filter(c => c.gamesFinalized && !c.payoutComplete);
    },
  });

  const distributeMutation = useMutation({
    mutationFn: (contestId: number) => claimAllPrizes(contestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContests() });
    },
  });

  const distributeAll = async () => {
    const contests = query.data ?? [];
    const eligibleContests = contests.filter(
      contest => Date.now() >= contest.payoutDeadline * 1000,
    );

    for (const contest of eligibleContests) {
      try {
        await claimAllPrizes(contest.id);
      } catch (error) {
        console.error(
          `Failed to distribute prizes for contest ${contest.id}:`,
          error,
        );
      }
    }

    // Refresh the list after all distributions
    await queryClient.invalidateQueries({
      queryKey: queryKeys.adminContests(),
    });
  };

  return {
    contests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    distributePrizes: distributeMutation.mutate,
    isDistributing: (contestId: number) =>
      distributeMutation.isPending &&
      distributeMutation.variables === contestId,
    distributeAll,
  };
}
