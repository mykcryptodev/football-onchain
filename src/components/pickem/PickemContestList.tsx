"use client";

import { Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

import ContestStatsCard from "@/components/pickem/ContestStatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TokensResponse } from "@/app/api/tokens/route";
import {
  chain,
  chainlinkGasLimit,
  chainlinkJobId,
  chainlinkSubscriptionId,
  usdc,
} from "@/constants";
import { usePickemContract } from "@/hooks/usePickemContract";
import { useMultipleWeekResultsFinalized } from "@/hooks/useWeekResultsFinalized";

interface PickemContest {
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
  payoutType: number;
  gameIds: string[];
  entryFeeUsd?: number;
}

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

const PAYOUT_TYPE_LABELS: Record<number, string> = {
  0: "Winner Take All",
  1: "Top 3",
  2: "Top 5",
};

export default function PickemContestList() {
  const account = useActiveAccount();
  const {
    getContest,
    getNextContestId,
    requestWeekResults,
    updateContestResults,
    claimAllPrizes,
    calculateScoresBatch,
    getContestTokenIds,
  } = usePickemContract();
  const [contests, setContests] = useState<PickemContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingResults, setFetchingResults] = useState<
    Record<number, boolean>
  >({});
  const [claimingPrizes, setClaimingPrizes] = useState<Record<number, boolean>>(
    {},
  );
  const [finalizingGames, setFinalizingGames] = useState<
    Record<number, boolean>
  >({});
  const [calculatingScores, setCalculatingScores] = useState<
    Record<number, boolean>
  >({});

  // Use hook to check week results finalization for all contests
  const { statusMap: weekResultsFinalized, refresh: refreshWeekResults } =
    useMultipleWeekResultsFinalized(
      contests.map(contest => ({
        contestId: contest.id,
        year: contest.year,
        seasonType: contest.seasonType,
        weekNumber: contest.weekNumber,
        enabled: !contest.gamesFinalized, // Only check if games aren't finalized yet
      })),
    );

  useEffect(() => {
    fetchContests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContests = async () => {
    try {
      const nextId = await getNextContestId();
      const fetchedContests: PickemContest[] = [];

      // Fetch all contests (starting from 0, as contest IDs start from 0)
      for (let i = 0; i < nextId; i++) {
        try {
          const contest = await getContest(i);
          if (contest && Number(contest.id) === i) {
            // Convert bigint values and format for frontend
            fetchedContests.push({
              id: Number(contest.id),
              creator: contest.creator,
              seasonType: contest.seasonType,
              weekNumber: contest.weekNumber,
              year: Number(contest.year),
              entryFee: contest.entryFee,
              currency: contest.currency,
              totalPrizePool: contest.totalPrizePool,
              totalEntries: Number(contest.totalEntries),
              submissionDeadline: Number(contest.submissionDeadline) * 1000, // Convert to milliseconds
              gamesFinalized: contest.gamesFinalized,
              payoutComplete: contest.payoutComplete,
              payoutType: contest.payoutStructure.payoutType,
              gameIds: contest.gameIds.map(id => id.toString()),
            });
          }
        } catch (err) {
          console.log(`Contest ${i} not found or error:`, err);
        }
      }

      // Sort by submission deadline (newest first)
      fetchedContests.sort(
        (a, b) => b.submissionDeadline - a.submissionDeadline,
      );

      // Fetch USD prices for all unique currencies
      const uniqueCurrencies = [
        ...new Set(fetchedContests.map(c => c.currency)),
      ];
      const tokenPriceMap: Record<
        string,
        { priceUsd: number; decimals: number }
      > = {};

      // USDC is always $1, no need to fetch price
      const usdcAddress = usdc[chain.id].toLowerCase();

      await Promise.all(
        uniqueCurrencies.map(async currency => {
          // Skip API call for USDC - it's always $1
          if (currency.toLowerCase() === usdcAddress) {
            tokenPriceMap[currency] = {
              priceUsd: 1,
              decimals: 6, // USDC has 6 decimals
            };
            return;
          }

          try {
            const tokenResponse = await fetch(
              `/api/tokens?chainId=${chain.id}&name=${currency}`,
            );

            if (tokenResponse.ok) {
              const tokenData: TokensResponse = await tokenResponse.json();
              if (tokenData.result.tokens.length > 0) {
                const token = tokenData.result.tokens[0];
                tokenPriceMap[currency] = {
                  priceUsd: token.priceUsd,
                  decimals: token.decimals,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching token price for ${currency}:`, error);
          }
        }),
      );

      // Calculate USD values for each contest
      const contestsWithUsd = fetchedContests.map(contest => {
        // Use original currency address for lookup (case-insensitive via map keys)
        const tokenPrice = tokenPriceMap[contest.currency];
        if (tokenPrice) {
          const entryFeeInTokens =
            Number(contest.entryFee) / Math.pow(10, tokenPrice.decimals);
          return {
            ...contest,
            entryFeeUsd: entryFeeInTokens * tokenPrice.priceUsd,
          };
        }
        return contest;
      });

      setContests(contestsWithUsd);
    } catch (error) {
      console.error("Error fetching contests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWeekResults = async (contest: PickemContest) => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    setFetchingResults(prev => ({ ...prev, [contest.id]: true }));

    try {
      await requestWeekResults({
        year: contest.year,
        seasonType: contest.seasonType,
        weekNumber: contest.weekNumber,
        subscriptionId: chainlinkSubscriptionId[chain.id],
        gasLimit: Number(chainlinkGasLimit[chain.id]),
        jobId: chainlinkJobId[chain.id],
      });

      toast.success(
        "Week results fetch requested. This may take a few minutes.",
      );

      // Refresh the week results status after 10 seconds
      setTimeout(() => {
        refreshWeekResults();
      }, 10000);
    } catch (error) {
      const e = error as Error;
      console.error("Error requesting week results:", e);
      toast.error("Failed to request week results: " + e.message);
    } finally {
      setFetchingResults(prev => ({ ...prev, [contest.id]: false }));
    }
  };

  const handleClaimAllPrizes = async (contestId: number) => {
    setClaimingPrizes(prev => ({ ...prev, [contestId]: true }));

    try {
      await claimAllPrizes(contestId);
      toast.success("All prizes distributed to winners!");
      // Optionally refresh contests
      await fetchContests();
    } catch (error) {
      const e = error as Error;
      console.error("Error distributing prizes:", e);
      toast.error("Failed to distribute prizes: " + e.message);
    } finally {
      setClaimingPrizes(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const handleFinalizeGames = async (contestId: number) => {
    setFinalizingGames(prev => ({ ...prev, [contestId]: true }));

    try {
      await updateContestResults(contestId);
      toast.success("Game results finalized! Now you can calculate scores.");
      await fetchContests();
    } catch (error) {
      const e = error as Error;
      console.error("Error finalizing games:", e);
      toast.error("Failed to finalize game results: " + e.message);
    } finally {
      setFinalizingGames(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const handleCalculateScores = async (contestId: number) => {
    setCalculatingScores(prev => ({ ...prev, [contestId]: true }));

    try {
      // Get all token IDs for this contest (single efficient call)
      const contestTokenIds = await getContestTokenIds(contestId);

      if (contestTokenIds.length === 0) {
        toast.info("No entries found for this contest");
        return;
      }

      toast.info(
        `Found ${contestTokenIds.length} entries. Calculating scores...`,
      );

      // Calculate scores in batches to avoid gas issues
      const BATCH_SIZE = 50;
      const numBatches = Math.ceil(contestTokenIds.length / BATCH_SIZE);

      for (let i = 0; i < numBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, contestTokenIds.length);
        const batch = contestTokenIds.slice(start, end);

        try {
          await calculateScoresBatch(batch);
          toast.success(
            `Calculated scores for batch ${i + 1}/${numBatches} (${batch.length} entries)`,
          );
        } catch (error) {
          console.error(`Error calculating batch ${i + 1}:`, error);
          toast.error(`Failed to calculate batch ${i + 1}/${numBatches}`);
        }
      }

      toast.success("All scores calculated and leaderboard updated!");
      await fetchContests();
    } catch (error) {
      console.error("Error calculating scores:", error);
      toast.error("Failed to calculate scores");
    } finally {
      setCalculatingScores(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const getTimeRemaining = (deadline: number) => {
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) return "Closed";

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h remaining`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contests.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Contests</h3>
        <p className="text-muted-foreground">
          Be the first to create a Pick&apos;em contest for this week!
        </p>
      </div>
    );
  }

  const renderContestCard = (contest: PickemContest) => (
    <Card key={contest.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">
              {SEASON_TYPE_LABELS[contest.seasonType]} Week {contest.weekNumber}
            </h3>
            <p className="text-sm text-muted-foreground">
              {contest.year} Season • {contest.gameIds.length} Games
            </p>
          </div>
          <Badge
            variant={
              contest.submissionDeadline > Date.now() ? "default" : "secondary"
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            {getTimeRemaining(contest.submissionDeadline)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ContestStatsCard
          entryFee={contest.entryFee}
          currency={contest.currency}
          totalPrizePool={contest.totalPrizePool}
          totalEntries={contest.totalEntries}
          payoutType={PAYOUT_TYPE_LABELS[contest.payoutType]}
          entryFeeUsd={contest.entryFeeUsd}
          showCard={false}
          className="mb-4"
        />

        {contest.submissionDeadline > Date.now() && (
          <Link className="w-full block mb-2" href={`/pickem/${contest.id}`}>
            <Button
              className="w-full"
              disabled={contest.submissionDeadline <= Date.now()}
            >
              Make Your Picks
            </Button>
          </Link>
        )}
        <Link className="w-full block mb-2" href={`/pickem/${contest.id}`}>
          <Button className="w-full" size="sm" variant="outline">
            View All Picks
          </Button>
        </Link>

        {/* Show these buttons when games are not yet finalized */}
        {!contest.gamesFinalized && (
          <>
            {/* Only show Fetch Week Results button if results are not already finalized in oracle */}
            {!weekResultsFinalized[contest.id] && (
              <Button
                className="w-full mb-2"
                disabled={fetchingResults[contest.id] || !account}
                size="sm"
                variant="outline"
                onClick={() => handleFetchWeekResults(contest)}
              >
                {fetchingResults[contest.id]
                  ? "Requesting..."
                  : "Fetch Week Results"}
              </Button>
            )}
            <Button
              className="w-full mb-2"
              disabled={finalizingGames[contest.id] || !account}
              size="sm"
              variant="secondary"
              onClick={() => handleFinalizeGames(contest.id)}
            >
              {finalizingGames[contest.id] ? "Finalizing..." : "Finalize Games"}
            </Button>
          </>
        )}

        {contest.gamesFinalized && !contest.payoutComplete && (
          <div className="flex gap-2 items-center w-full">
            <Button
              className="w-full mb-2"
              disabled={calculatingScores[contest.id] || !account}
              size="sm"
              variant="default"
              onClick={() => handleCalculateScores(contest.id)}
            >
              {calculatingScores[contest.id]
                ? "Calculating..."
                : "Calculate Scores"}
            </Button>
          </div>
        )}

        {contest.gamesFinalized && !contest.payoutComplete && (
          <div className="flex gap-2 items-center w-full">
            <Button
              className="flex-1"
              disabled={claimingPrizes[contest.id] || !account}
              size="sm"
              variant="secondary"
              onClick={() => handleClaimAllPrizes(contest.id)}
            >
              {claimingPrizes[contest.id]
                ? "Distributing..."
                : "Distribute All Prizes"}
            </Button>
          </div>
        )}

        {contest.gamesFinalized && contest.payoutComplete && (
          <div className="text-center py-3 px-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-medium">
              ✓ All prizes have been distributed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Helper function to determine if a contest is completed
  const isContestCompleted = (contest: PickemContest) => {
    // Contest is completed if payouts are complete
    if (contest.payoutComplete) return true;

    // Contest with 0 entries and closed submissions is also completed
    // (nothing left to happen - no entries to score, no prizes to distribute)
    if (
      contest.totalEntries === 0 &&
      contest.submissionDeadline <= Date.now()
    ) {
      return true;
    }

    return false;
  };

  return (
    <Tabs className="space-y-4" defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
        <TabsTrigger value="all">All</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="active">
        {contests.filter(contest => !isContestCompleted(contest)).length ===
        0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Contests</h3>
            <p className="text-muted-foreground">
              All contests have completed payouts
            </p>
          </div>
        ) : (
          contests
            .filter(contest => !isContestCompleted(contest))
            .map(contest => renderContestCard(contest))
        )}
      </TabsContent>

      <TabsContent className="space-y-4" value="completed">
        {contests.filter(contest => isContestCompleted(contest)).length ===
        0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Completed Contests
            </h3>
            <p className="text-muted-foreground">
              No contests have completed payouts yet
            </p>
          </div>
        ) : (
          contests
            .filter(contest => isContestCompleted(contest))
            .map(contest => renderContestCard(contest))
        )}
      </TabsContent>

      <TabsContent className="space-y-4" value="all">
        {contests.map(contest => renderContestCard(contest))}
      </TabsContent>
    </Tabs>
  );
}
