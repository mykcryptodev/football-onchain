"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";

import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemNFT } from "@/hooks/usePickemNFT";
import { queryKeys } from "@/lib/query-keys";

export interface UserPickemEntry {
  tokenId: number;
  contestId: number;
  year: number;
  seasonType: number;
  weekNumber: number;
  gameIds: string[];
  picks: number[];
  correctPicks: number;
  tiebreakerPoints: number;
  gamesFinalized: boolean;
  payoutComplete: boolean;
  submissionDeadline: number;
}

interface UseUserPickemsReturn {
  entries: UserPickemEntry[];
  contestIds: Set<number>;
  isLoading: boolean;
}

export function useUserPickems(): UseUserPickemsReturn {
  const account = useActiveAccount();
  const { getContest, getNFTPrediction, getUserPicks } = usePickemContract();
  const { tokensOfOwner } = usePickemNFT();
  const address = account?.address;

  const query = useQuery({
    queryKey: queryKeys.userPickems(address ?? ""),
    enabled: Boolean(address),
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<UserPickemEntry[]> => {
      if (!address) return [];

      const tokenIds = await tokensOfOwner(address);
      const contestCache = new Map<
        number,
        Awaited<ReturnType<typeof getContest>>
      >();

      const entries = await Promise.all(
        tokenIds.map(async tokenIdBigint => {
          const tokenId = Number(tokenIdBigint);
          const prediction = await getNFTPrediction(tokenId);
          const contestId = Number(prediction[0]);

          let contest = contestCache.get(contestId);
          if (!contest) {
            contest = await getContest(contestId);
            contestCache.set(contestId, contest);
          }

          const gameIds = contest.gameIds.map(id => id.toString());
          const picks = await getUserPicks(tokenId, [...contest.gameIds]);

          return {
            tokenId,
            contestId,
            year: Number(contest.year),
            seasonType: Number(contest.seasonType),
            weekNumber: Number(contest.weekNumber),
            gameIds,
            picks: picks.map(pick => Number(pick)),
            correctPicks: Number(prediction[4]),
            tiebreakerPoints: Number(prediction[3]),
            gamesFinalized: contest.gamesFinalized,
            payoutComplete: contest.payoutComplete,
            submissionDeadline: Number(contest.submissionDeadline) * 1000,
          };
        }),
      );

      return entries.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.weekNumber !== b.weekNumber) return b.weekNumber - a.weekNumber;
        return b.tokenId - a.tokenId;
      });
    },
  });

  const entries = query.data ?? [];

  return {
    entries,
    contestIds: new Set(entries.map(entry => entry.contestId)),
    isLoading: Boolean(address) && query.isLoading,
  };
}
