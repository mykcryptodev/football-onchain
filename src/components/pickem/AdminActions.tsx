"use client";

import { Calendar, CheckCircle, Clock, DollarSign, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import { formatEther } from "viem";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePickemContract } from "@/hooks/usePickemContract";

interface ContestInfo {
  id: number;
  seasonType: number;
  weekNumber: number;
  year: number;
  totalPrizePool: bigint;
  totalEntries: number;
  gamesFinalized: boolean;
  payoutComplete: boolean;
  payoutDeadline: number;
}

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

export default function AdminActions() {
  const account = useActiveAccount();
  const { getContest, getNextContestId, claimAllPrizes } = usePickemContract();

  const [contests, setContests] = useState<ContestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (account?.address) {
      fetchContests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const nextId = await getNextContestId();
      const contestPromises = [];

      // Fetch all contests
      for (let i = 0; i < nextId; i++) {
        contestPromises.push(getContest(i));
      }

      const allContests = await Promise.all(contestPromises);

      // Filter for contests that are finalized but payout not complete
      const pendingPayouts = allContests
        .map((contest, index) => ({
          id: index,
          seasonType: Number(contest.seasonType),
          weekNumber: Number(contest.weekNumber),
          year: Number(contest.year),
          totalPrizePool: contest.totalPrizePool,
          totalEntries: Number(contest.totalEntries),
          gamesFinalized: contest.gamesFinalized,
          payoutComplete: contest.payoutComplete,
          payoutDeadline: Number(contest.payoutDeadline),
        }))
        .filter(contest => contest.gamesFinalized && !contest.payoutComplete);

      setContests(pendingPayouts);
    } catch (error) {
      console.error("Error fetching contests:", error);
      toast.error("Failed to fetch contests");
    } finally {
      setLoading(false);
    }
  };

  const handleDistributePrizes = async (contestId: number) => {
    setDistributing(prev => ({ ...prev, [contestId]: true }));

    try {
      await claimAllPrizes(contestId);
      toast.success(`Prizes distributed for Contest #${contestId}!`);
      await fetchContests(); // Refresh
    } catch (error) {
      console.error("Error distributing prizes:", error);
      toast.error("Failed to distribute prizes");
    } finally {
      setDistributing(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const handleDistributeAll = async () => {
    const eligibleContests = contests.filter(
      contest => Date.now() >= contest.payoutDeadline * 1000,
    );

    if (eligibleContests.length === 0) {
      toast.error("No contests are eligible for payout yet");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const contest of eligibleContests) {
      setDistributing(prev => ({ ...prev, [contest.id]: true }));
      try {
        await claimAllPrizes(contest.id);
        successCount++;
        toast.success(
          `Contest #${contest.id} prizes distributed (${successCount}/${eligibleContests.length})`,
        );
      } catch (error) {
        console.error(
          `Error distributing prizes for contest ${contest.id}:`,
          error,
        );
        failCount++;
      }
      setDistributing(prev => ({ ...prev, [contest.id]: false }));
    }

    if (successCount > 0) {
      toast.success(
        `Successfully distributed prizes for ${successCount} contest(s)!`,
      );
    }

    if (failCount > 0) {
      toast.error(`Failed to distribute prizes for ${failCount} contest(s)`);
    }

    await fetchContests();
  };

  const getPayoutStatus = (contest: ContestInfo) => {
    const now = Date.now();
    const deadline = contest.payoutDeadline * 1000;

    if (now >= deadline) {
      return (
        <Badge variant="default">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ready to Distribute
        </Badge>
      );
    }

    const hoursRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60));
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        {hoursRemaining}h until payout
      </Badge>
    );
  };

  if (!account) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Connect your wallet to manage prize distributions
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (contests.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Prizes Distributed</h3>
          <p className="text-muted-foreground">
            There are no contests waiting for prize distribution
          </p>
        </CardContent>
      </Card>
    );
  }

  const eligibleForPayout = contests.filter(
    contest => Date.now() >= contest.payoutDeadline * 1000,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Prize Distribution Dashboard
            </span>
            {eligibleForPayout.length > 0 && (
              <Button onClick={handleDistributeAll} variant="default">
                <DollarSign className="h-4 w-4 mr-2" />
                Distribute All Eligible ({eligibleForPayout.length})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {contests.length} contest{contests.length > 1 ? "s" : ""} waiting
            for prize distribution. {eligibleForPayout.length} ready now.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {contests.map(contest => (
          <Card key={contest.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Contest #{contest.id}</h3>
                    {getPayoutStatus(contest)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {SEASON_TYPE_LABELS[contest.seasonType]} Week{" "}
                      {contest.weekNumber} {contest.year}
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {contest.totalEntries} entries
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatEther(contest.totalPrizePool)} ETH
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleDistributePrizes(contest.id)}
                  disabled={
                    distributing[contest.id] ||
                    Date.now() < contest.payoutDeadline * 1000
                  }
                  variant="secondary"
                  size="sm"
                >
                  {distributing[contest.id] ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Distribute Prizes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
