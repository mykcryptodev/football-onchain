import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Contest } from "./types";

interface PayoutsCardProps {
  contest: Contest;
}

export function PayoutsCard({ contest }: PayoutsCardProps) {
  const formatEther = (wei: number) => {
    return (wei / 1e18).toFixed(4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span>Q1 (15%):</span>
          <span
            className={
              contest.rewardsPaid.q1Paid ? "text-green-600 font-semibold" : ""
            }
          >
            {formatEther(contest.totalRewards * 0.15)} ETH
            {contest.rewardsPaid.q1Paid && " ✓"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Q2 (30%):</span>
          <span
            className={
              contest.rewardsPaid.q2Paid ? "text-green-600 font-semibold" : ""
            }
          >
            {formatEther(contest.totalRewards * 0.3)} ETH
            {contest.rewardsPaid.q2Paid && " ✓"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Q3 (15%):</span>
          <span
            className={
              contest.rewardsPaid.q3Paid ? "text-green-600 font-semibold" : ""
            }
          >
            {formatEther(contest.totalRewards * 0.15)} ETH
            {contest.rewardsPaid.q3Paid && " ✓"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Final (38%):</span>
          <span
            className={
              contest.rewardsPaid.finalPaid
                ? "text-green-600 font-semibold"
                : ""
            }
          >
            {formatEther(contest.totalRewards * 0.38)} ETH
            {contest.rewardsPaid.finalPaid && " ✓"}
          </span>
        </div>
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Treasury (2%):</span>
            <span>{formatEther(contest.totalRewards * 0.02)} ETH</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
