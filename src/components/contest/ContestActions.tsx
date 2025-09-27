import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPayoutStrategyType } from "@/lib/payout-utils";

import { Contest, PayoutStrategyType } from "./types";

interface ContestActionsProps {
  contest: Contest;
  onRequestRandomNumbers?: () => Promise<any>;
  onRefreshGameScores?: () => void;
  onRefreshContestData?: () => void;
  onProcessPayouts?: () => void;
  onViewTransactionHistory?: () => void;
  isRequestingRandomNumbers?: boolean;
  isRefreshingContestData?: boolean;
  isRefreshingGameScores?: boolean;
}

export function ContestActions({
  contest,
  onRequestRandomNumbers,
  onRefreshGameScores,
  onRefreshContestData,
  onProcessPayouts,
  onViewTransactionHistory,
  isRequestingRandomNumbers = false,
  isRefreshingContestData = false,
  isRefreshingGameScores = false,
}: ContestActionsProps) {
  const strategyType = getPayoutStrategyType(contest.payoutStrategy);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!contest.randomValuesSet && (
          <Button
            className="w-full"
            variant="outline"
            onClick={onRequestRandomNumbers}
            disabled={isRequestingRandomNumbers}
          >
            {isRequestingRandomNumbers
              ? "Requesting..."
              : "Request Random Numbers"}
          </Button>
        )}
        <Button
          className="w-full"
          variant="outline"
          onClick={onRefreshContestData}
          disabled={isRefreshingContestData}
        >
          {isRefreshingContestData ? "Refreshing..." : "Refresh Contest Data"}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={onRefreshGameScores}
          disabled={isRefreshingGameScores}
        >
          {isRefreshingGameScores ? "Refreshing..." : "Refresh Game Scores"}
        </Button>
        {contest.randomValuesSet && (
          <Button
            className="w-full"
            variant="default"
            onClick={onProcessPayouts}
          >
            {strategyType === PayoutStrategyType.SCORE_CHANGES
              ? "Process All Payouts (Game Must Be Finished)"
              : "Process Available Payouts"}
          </Button>
        )}
        <Button
          className="w-full"
          variant="outline"
          onClick={onViewTransactionHistory}
        >
          View Transaction History
        </Button>
      </CardContent>
    </Card>
  );
}
