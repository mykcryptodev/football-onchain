"use client";

import { Calendar, CheckCircle, Clock, DollarSign, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContestInfo, useAdminContests } from "@/hooks/useAdminContests";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

// Helper component to display formatted prize pool
function PrizePoolDisplay({
  prizePool,
  currency,
}: {
  prizePool: bigint;
  currency: string;
}) {
  const { formattedValue, isLoading } = useFormattedCurrency({
    amount: prizePool,
    currencyAddress: currency,
  });

  return <>{isLoading ? "..." : formattedValue}</>;
}

export default function AdminActions() {
  const account = useActiveAccount();
  const {
    contests,
    isLoading: loading,
    distributePrizes,
    isDistributing,
    distributeAll,
  } = useAdminContests();

  const handleDistributePrizes = async (contestId: number) => {
    try {
      distributePrizes(contestId);
      toast.success(`Prizes distributed for Contest #${contestId}!`);
    } catch (error) {
      const e = error as Error;
      console.error("Error distributing prizes:", e);
      toast.error("Failed to distribute prizes: " + e.message);
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

    try {
      await distributeAll();
      toast.success(
        "Successfully distributed prizes for all eligible contests!",
      );
    } catch (error) {
      console.error("Error distributing all prizes:", error);
      toast.error("Failed to distribute some prizes");
    }
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
              <Button variant="default" onClick={handleDistributeAll}>
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
                      <PrizePoolDisplay
                        currency={contest.currency}
                        prizePool={contest.totalPrizePool}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    isDistributing(contest.id) ||
                    Date.now() < contest.payoutDeadline * 1000
                  }
                  onClick={() => handleDistributePrizes(contest.id)}
                >
                  {isDistributing(contest.id) ? (
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
