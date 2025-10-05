import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPayoutStrategyType } from "@/lib/payout-utils";

import { Contest, PayoutStrategyType } from "./types";

interface ContestActionsProps {
  contest: Contest;
  onRequestRandomNumbers?: () => Promise<void>;
  onRefreshGameScores?: () => void;
  onRefreshContestData?: () => void;
  onProcessPayouts?: () => void;
  onSyncScoresOnchain?: () => Promise<void>;
  onViewTransactionHistory?: () => void;
  isRequestingRandomNumbers?: boolean;
  isRefreshingContestData?: boolean;
  isRefreshingGameScores?: boolean;
  isProcessingPayouts?: boolean;
  isSyncingScoresOnchain?: boolean;
}

export function ContestActions({
  contest,
  onRequestRandomNumbers,
  onRefreshGameScores,
  onRefreshContestData,
  onProcessPayouts,
  onSyncScoresOnchain,
  onViewTransactionHistory,
  isRequestingRandomNumbers = false,
  isRefreshingContestData = false,
  isRefreshingGameScores = false,
  isProcessingPayouts = false,
  isSyncingScoresOnchain = false,
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
            disabled={isRequestingRandomNumbers}
            variant="outline"
            onClick={onRequestRandomNumbers}
          >
            {isRequestingRandomNumbers
              ? "Requesting..."
              : "Request Random Numbers"}
          </Button>
        )}
        <Button
          className="w-full"
          disabled={isRefreshingContestData}
          variant="outline"
          onClick={onRefreshContestData}
        >
          {isRefreshingContestData ? "Refreshing..." : "Refresh Contest Data"}
        </Button>
        <Button
          className="w-full"
          disabled={isRefreshingGameScores}
          variant="outline"
          onClick={onRefreshGameScores}
        >
          {isRefreshingGameScores ? "Refreshing..." : "Refresh Game Scores"}
        </Button>
        <Button
          className="w-full"
          disabled={isSyncingScoresOnchain}
          variant="outline"
          onClick={onSyncScoresOnchain}
        >
          {isSyncingScoresOnchain ? "Syncing..." : "Sync Scores Onchain"}
        </Button>
        {contest.randomValuesSet && (
          <Button
            className="w-full"
            disabled={isProcessingPayouts}
            variant="default"
            onClick={onProcessPayouts}
          >
            {isProcessingPayouts
              ? "Processing..."
              : strategyType === PayoutStrategyType.SCORE_CHANGES
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
