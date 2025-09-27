import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatEther,
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
  getStrategyDisplayName,
} from "@/lib/payout-utils";

import { Contest } from "./types";

interface PayoutsCardProps {
  contest: Contest;
  scoreChangeCount?: number; // Optional: number of score changes (for score-changes strategy)
}

export function PayoutsCard({
  contest,
  scoreChangeCount = 0,
}: PayoutsCardProps) {
  if (!contest.payoutStrategy) {
    return null;
  }

  const strategyType = getPayoutStrategyType(contest.payoutStrategy);
  const strategyName = getStrategyDisplayName(strategyType);

  const renderQuartersOnlyPayouts = () => {
    const payouts = getQuartersOnlyPayouts(contest.totalRewards);

    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Q1 (15%):</span>
          <span>{formatEther(payouts.q1.amount)} ETH</span>
        </div>
        <div className="flex justify-between">
          <span>Q2 (20%):</span>
          <span>{formatEther(payouts.q2.amount)} ETH</span>
        </div>
        <div className="flex justify-between">
          <span>Q3 (15%):</span>
          <span>{formatEther(payouts.q3.amount)} ETH</span>
        </div>
        <div className="flex justify-between">
          <span>Final (50%):</span>
          <span>{formatEther(payouts.q4.amount)} ETH</span>
        </div>
      </div>
    );
  };

  const renderScoreChangesPayouts = () => {
    const payouts = getScoreChangesPayouts(
      contest.totalRewards,
      scoreChangeCount,
    );

    return (
      <div className="space-y-3">
        {/* Score Changes Section */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Score Changes (50%):</span>
            <span>{formatEther(payouts.scoreChanges.totalAllocation)} ETH</span>
          </div>
          <div className="pl-4 text-sm text-muted-foreground">
            {scoreChangeCount > 0 ? (
              <div>
                {scoreChangeCount} changes ×{" "}
                {formatEther(payouts.scoreChanges.perScoreChange)} ETH each
              </div>
            ) : (
              <div>Pending game completion</div>
            )}
          </div>
        </div>

        {/* Quarters Section */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Quarters (50%):</span>
            <span>{formatEther(payouts.scoreChanges.totalAllocation)} ETH</span>
          </div>
          <div className="pl-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Q1 (7.5%):</span>
              <span>{formatEther(payouts.quarters.q1.amount)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span>Q2 (10%):</span>
              <span>{formatEther(payouts.quarters.q2.amount)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span>Q3 (7.5%):</span>
              <span>{formatEther(payouts.quarters.q3.amount)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span>Final (25%):</span>
              <span>{formatEther(payouts.quarters.q4.amount)} ETH</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payouts</CardTitle>
          <Badge variant="outline" className="text-xs">
            {strategyName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategyType === "quarters-only"
          ? renderQuartersOnlyPayouts()
          : renderScoreChangesPayouts()}

        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Treasury Fee (2%):</span>
            <span>{formatEther(contest.totalRewards * 0.02)} ETH</span>
          </div>
          <div className="flex justify-between font-semibold mt-1">
            <span>Total Payouts Made:</span>
            <span>{contest.payoutsPaid.totalPayoutsMade}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span>{formatEther(contest.payoutsPaid.totalAmountPaid)} ETH</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
