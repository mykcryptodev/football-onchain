import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chain } from "@/constants";
import { getPayoutStrategyType } from "@/lib/payout-utils";

import { Contest, PayoutStrategyType } from "./types";

interface ContestActionsProps {
  contest: Contest;
  onRequestRandomNumbers?: () => Promise<void>;
  onRefreshGameScores?: () => void;
  onRefreshContestData?: () => void;
  onProcessPayouts?: () => void;
  onSyncScoresOnchain?: () => Promise<void>;
  onFetchScoreChanges?: () => Promise<void>;
  onViewTransactionHistory?: () => void;
  isRequestingRandomNumbers?: boolean;
  isRefreshingContestData?: boolean;
  isRefreshingGameScores?: boolean;
  isProcessingPayouts?: boolean;
  isSyncingScoresOnchain?: boolean;
  isFetchingScoreChanges?: boolean;
}

export function ContestActions({
  contest,
  onRequestRandomNumbers,
  onRefreshGameScores,
  onRefreshContestData,
  onProcessPayouts,
  onSyncScoresOnchain,
  onFetchScoreChanges,
  onViewTransactionHistory,
  isRequestingRandomNumbers = false,
  isRefreshingContestData = false,
  isRefreshingGameScores = false,
  isProcessingPayouts = false,
  isSyncingScoresOnchain = false,
  isFetchingScoreChanges = false,
}: ContestActionsProps) {
  const strategyType = getPayoutStrategyType(contest.payoutStrategy);
  const payoutsProcessed = contest.payoutsPaid.totalPayoutsMade > 0;

  // Get block explorer URL based on chain
  const getExplorerUrl = (txHash: string) => {
    if (chain.id === 8453) {
      // Base mainnet
      return `https://basescan.org/tx/${txHash}`;
    } else if (chain.id === 84532) {
      // Base Sepolia testnet
      return `https://sepolia.basescan.org/tx/${txHash}`;
    } else {
      // Fallback to generic explorer
      return `https://explorer.chain.id/tx/${txHash}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {payoutsProcessed ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Payouts have been processed. No actions available.
            </p>
            {contest.payoutTransactionHash && (
              <div className="text-center">
                <a
                  className="text-sm text-primary hover:underline break-all"
                  href={getExplorerUrl(contest.payoutTransactionHash)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View Payout Transaction
                </a>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {contest.payoutTransactionHash}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
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
              {isRefreshingContestData
                ? "Refreshing..."
                : "Refresh Contest Data"}
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
            {strategyType === PayoutStrategyType.SCORE_CHANGES &&
              contest.randomValuesSet && (
                <Button
                  className="w-full"
                  disabled={isFetchingScoreChanges}
                  variant="outline"
                  onClick={onFetchScoreChanges}
                >
                  {isFetchingScoreChanges
                    ? "Fetching..."
                    : "Fetch Score Changes"}
                </Button>
              )}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
