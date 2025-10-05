"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  chain,
  chainlinkGasLimit,
  chainlinkJobId,
  chainlinkSubscriptionId,
} from "@/constants";
import { usePickemContract } from "@/hooks/usePickemContract";
import { Calendar, Clock, DollarSign, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import { formatEther } from "viem";

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
  payoutType: number;
  gameIds: string[];
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
  } = usePickemContract();
  const [contests, setContests] = useState<PickemContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingResults, setFetchingResults] = useState<
    Record<number, boolean>
  >({});
  const [claimingPrizes, setClaimingPrizes] = useState<Record<number, boolean>>(
    {},
  );
  const [calculatingWinners, setCalculatingWinners] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    fetchContests();
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
              currency:
                contest.currency ===
                "0x0000000000000000000000000000000000000000"
                  ? "ETH"
                  : "USDC",
              totalPrizePool: contest.totalPrizePool,
              totalEntries: Number(contest.totalEntries),
              submissionDeadline: Number(contest.submissionDeadline) * 1000, // Convert to milliseconds
              gamesFinalized: contest.gamesFinalized,
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

      setContests(fetchedContests);
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
    } catch (error) {
      console.error("Error requesting week results:", error);
      toast.error("Failed to request week results");
    } finally {
      setFetchingResults(prev => ({ ...prev, [contest.id]: false }));
    }
  };

  const handleClaimAllPrizes = async (contestId: number) => {
    setClaimingPrizes(prev => ({ ...prev, [contestId]: true }));

    try {
      await claimAllPrizes(contestId);
      toast.success("All prizes claimed successfully!");
      // Optionally refresh contests
      await fetchContests();
    } catch (error) {
      console.error("Error claiming all prizes:", error);
      toast.error("Failed to claim all prizes");
    } finally {
      setClaimingPrizes(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const handleCalculateWinners = async (contestId: number) => {
    setCalculatingWinners(prev => ({ ...prev, [contestId]: true }));

    try {
      await updateContestResults(contestId);
      toast.success("Winners calculated successfully!");
      // Optionally refresh contests to update gamesFinalized
      await fetchContests();
    } catch (error) {
      console.error("Error calculating winners:", error);
      toast.error("Failed to calculate winners");
    } finally {
      setCalculatingWinners(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const getTimeRemaining = (deadline: number) => {
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) return "Closed";

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h remaining`;
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

  return (
    <>
      <div className="space-y-4">
        {contests.map(contest => (
          <Card key={contest.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">
                    {SEASON_TYPE_LABELS[contest.seasonType]} Week{" "}
                    {contest.weekNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {contest.year} Season • {contest.gameIds.length} Games
                  </p>
                </div>
                <Badge
                  variant={
                    contest.submissionDeadline > Date.now()
                      ? "default"
                      : "secondary"
                  }
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeRemaining(contest.submissionDeadline)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entry Fee</p>
                    <p className="font-medium">
                      {contest.currency === "ETH"
                        ? `${formatEther(contest.entryFee)} ETH`
                        : `${Number(contest.entryFee) / 1e6} USDC`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prize Pool</p>
                    <p className="font-medium">
                      {contest.currency === "ETH"
                        ? `${formatEther(contest.totalPrizePool)} ETH`
                        : `${Number(contest.totalPrizePool) / 1e6} USDC`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entries</p>
                    <p className="font-medium">{contest.totalEntries}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Payout</p>
                    <p className="font-medium">
                      {PAYOUT_TYPE_LABELS[contest.payoutType]}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={`/pickem/${contest.id}`}
                className="w-full block mb-2"
              >
                <Button
                  disabled={contest.submissionDeadline <= Date.now()}
                  className="w-full"
                >
                  {contest.submissionDeadline <= Date.now()
                    ? "Submissions Closed"
                    : "Make Your Picks"}
                </Button>
              </Link>

              {!contest.gamesFinalized && (
                <>
                  <Button
                    onClick={() => handleFetchWeekResults(contest)}
                    disabled={fetchingResults[contest.id] || !account}
                    variant="outline"
                    size="sm"
                    className="w-full mb-2"
                  >
                    {fetchingResults[contest.id]
                      ? "Requesting..."
                      : "Fetch Week Results"}
                  </Button>
                  <Button
                    onClick={() => handleCalculateWinners(contest.id)}
                    disabled={calculatingWinners[contest.id] || !account}
                    variant="secondary"
                    size="sm"
                    className="w-full mb-2"
                  >
                    {calculatingWinners[contest.id]
                      ? "Calculating..."
                      : "Calculate Winners"}
                  </Button>
                </>
              )}

              {contest.gamesFinalized && (
                <Button
                  onClick={() => handleClaimAllPrizes(contest.id)}
                  disabled={claimingPrizes[contest.id] || !account}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  {claimingPrizes[contest.id]
                    ? "Claiming..."
                    : "Claim All Prizes"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
