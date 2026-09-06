"use client";

import { useQuery } from "@tanstack/react-query";

import { usePickemContract } from "@/hooks/usePickemContract";
import { queryKeys } from "@/lib/query-keys";

export interface PickemContestListItem {
  id: number;
  creator: string;
  seasonType: number;
  weekNumber: number;
  year: number;
  entryFee: bigint;
  currency: string;
  totalPrizePool: bigint;
  totalEntries: number;
  submissionDeadline: number;
  gamesFinalized: boolean;
  payoutComplete: boolean;
  payoutDeadline: number;
  payoutType: number;
  gameIds: string[];
}

interface UsePickemContestsReturn {
  contests: PickemContestListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePickemContests(): UsePickemContestsReturn {
  const { getContest, getNextContestId } = usePickemContract();

  const query = useQuery({
    queryKey: queryKeys.pickemContests(),
    queryFn: async () => {
      const nextId = await getNextContestId();
      const contests: PickemContestListItem[] = [];

      for (let i = 0; i < nextId; i++) {
        try {
          const contest = await getContest(i);
          if (contest && Number(contest.id) === i) {
            contests.push({
              id: Number(contest.id),
              creator: contest.creator,
              seasonType: contest.seasonType,
              weekNumber: contest.weekNumber,
              year: Number(contest.year),
              entryFee: contest.entryFee,
              currency: contest.currency,
              totalPrizePool: contest.totalPrizePool,
              totalEntries: Number(contest.totalEntries),
              submissionDeadline: Number(contest.submissionDeadline) * 1000,
              gamesFinalized: contest.gamesFinalized,
              payoutComplete: contest.payoutComplete,
              payoutDeadline: Number(contest.payoutDeadline) * 1000,
              payoutType: contest.payoutStructure.payoutType,
              gameIds: contest.gameIds.map(id => id.toString()),
            });
          }
        } catch (error) {
          console.error(`Error fetching pickem contest ${i}:`, error);
        }
      }

      return contests;
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
