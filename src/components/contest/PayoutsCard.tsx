import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import {
  getNetRewards,
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
  getStrategyDisplayName,
  getTreasuryFee,
} from "@/lib/payout-utils";

import { Contest, PayoutStrategyType } from "./types";

interface PayoutsCardProps {
  contest: Contest;
  scoreChangeCount?: number; // Optional: number of score changes (for score-changes strategy)
}

interface PayoutsFooterProps {
  totalRewards: number;
  totalAmountPaid: number;
  totalPayoutsMade: number;
  currencyAddress: string;
}

function PayoutsFooter({
  totalRewards,
  totalAmountPaid,
  totalPayoutsMade,
  currencyAddress,
}: PayoutsFooterProps) {
  const {
    formattedValue: treasuryFeeFormatted,
    isLoading: treasuryFeeLoading,
  } = useFormattedCurrency({
    amount: BigInt(Math.floor(getTreasuryFee(totalRewards))),
    currencyAddress,
  });
  const { formattedValue: amountPaidFormatted, isLoading: amountPaidLoading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(totalAmountPaid)),
      currencyAddress,
    });

  return (
    <div className="pt-2 border-t">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Treasury Fee (2%):</span>
        <span>{treasuryFeeLoading ? "..." : treasuryFeeFormatted}</span>
      </div>
      <div className="flex justify-between font-semibold mt-1">
        <span>Total Payouts Made:</span>
        <span>{totalPayoutsMade}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Amount Paid:</span>
        <span>{amountPaidLoading ? "..." : amountPaidFormatted}</span>
      </div>
    </div>
  );
}

export function PayoutsCard({
  contest,
  scoreChangeCount = 0,
}: PayoutsCardProps) {
  const currencyAddress = contest.boxCost.currency;

  // Calculate payouts for both strategies at the top level (before any returns)
  const netRewards = getNetRewards(contest.totalRewards);
  const quartersOnlyPayouts = getQuartersOnlyPayouts(netRewards);
  const scoreChangesPayouts = getScoreChangesPayouts(
    netRewards,
    scoreChangeCount,
  );

  // Format quarters-only payouts (always call hooks at top level before any returns)
  const { formattedValue: q1Formatted, isLoading: q1Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(quartersOnlyPayouts.q1.amount)),
      currencyAddress,
    });
  const { formattedValue: q2Formatted, isLoading: q2Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(quartersOnlyPayouts.q2.amount)),
      currencyAddress,
    });
  const { formattedValue: q3Formatted, isLoading: q3Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(quartersOnlyPayouts.q3.amount)),
      currencyAddress,
    });
  const { formattedValue: q4Formatted, isLoading: q4Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(quartersOnlyPayouts.q4.amount)),
      currencyAddress,
    });

  // Format score changes payouts (always call hooks at top level)
  const {
    formattedValue: scoreChangesTotalFormatted,
    isLoading: scoreChangesTotalLoading,
  } = useFormattedCurrency({
    amount: BigInt(
      Math.floor(scoreChangesPayouts.scoreChanges.totalAllocation),
    ),
    currencyAddress,
  });
  const {
    formattedValue: perScoreChangeFormatted,
    isLoading: perScoreChangeLoading,
  } = useFormattedCurrency({
    amount: BigInt(Math.floor(scoreChangesPayouts.scoreChanges.perScoreChange)),
    currencyAddress,
  });
  const {
    formattedValue: quartersTotalFormatted,
    isLoading: quartersTotalLoading,
  } = useFormattedCurrency({
    amount: BigInt(
      Math.floor(
        scoreChangesPayouts.quarters.q1.amount +
          scoreChangesPayouts.quarters.q2.amount +
          scoreChangesPayouts.quarters.q3.amount +
          scoreChangesPayouts.quarters.q4.amount,
      ),
    ),
    currencyAddress,
  });
  const { formattedValue: scQ1Formatted, isLoading: scQ1Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(scoreChangesPayouts.quarters.q1.amount)),
      currencyAddress,
    });
  const { formattedValue: scQ2Formatted, isLoading: scQ2Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(scoreChangesPayouts.quarters.q2.amount)),
      currencyAddress,
    });
  const { formattedValue: scQ3Formatted, isLoading: scQ3Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(scoreChangesPayouts.quarters.q3.amount)),
      currencyAddress,
    });
  const { formattedValue: scQ4Formatted, isLoading: scQ4Loading } =
    useFormattedCurrency({
      amount: BigInt(Math.floor(scoreChangesPayouts.quarters.q4.amount)),
      currencyAddress,
    });

  if (!contest.payoutStrategy) {
    return null;
  }

  const strategyType = getPayoutStrategyType(contest.payoutStrategy);
  const strategyName = getStrategyDisplayName(strategyType);

  const renderQuartersOnlyPayouts = () => {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Q1 (15%):</span>
          <span>{q1Loading ? "..." : q1Formatted}</span>
        </div>
        <div className="flex justify-between">
          <span>Q2 (20%):</span>
          <span>{q2Loading ? "..." : q2Formatted}</span>
        </div>
        <div className="flex justify-between">
          <span>Q3 (15%):</span>
          <span>{q3Loading ? "..." : q3Formatted}</span>
        </div>
        <div className="flex justify-between">
          <span>Final (50%):</span>
          <span>{q4Loading ? "..." : q4Formatted}</span>
        </div>
      </div>
    );
  };

  const renderScoreChangesPayouts = () => {
    return (
      <div className="space-y-3">
        {/* Score Changes Section */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Score Changes (50%):</span>
            <span>
              {scoreChangesTotalLoading ? "..." : scoreChangesTotalFormatted}
            </span>
          </div>
          <div className="pl-4 text-sm text-muted-foreground">
            {scoreChangeCount > 0 ? (
              <div>
                {scoreChangeCount} changes ×{" "}
                {perScoreChangeLoading ? "..." : perScoreChangeFormatted} each
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
            <span>{quartersTotalLoading ? "..." : quartersTotalFormatted}</span>
          </div>
          <div className="pl-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Q1 (7.5%):</span>
              <span>{scQ1Loading ? "..." : scQ1Formatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Q2 (10%):</span>
              <span>{scQ2Loading ? "..." : scQ2Formatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Q3 (7.5%):</span>
              <span>{scQ3Loading ? "..." : scQ3Formatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Final (25%):</span>
              <span>{scQ4Loading ? "..." : scQ4Formatted}</span>
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
          <Badge className="text-xs" variant="outline">
            {strategyName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Percentages are calculated after the 2% treasury fee.
        </p>
        {strategyType === PayoutStrategyType.QUARTERS_ONLY
          ? renderQuartersOnlyPayouts()
          : renderScoreChangesPayouts()}

        <PayoutsFooter
          currencyAddress={currencyAddress}
          totalAmountPaid={contest.payoutsPaid.totalAmountPaid}
          totalPayoutsMade={contest.payoutsPaid.totalPayoutsMade}
          totalRewards={contest.totalRewards}
        />
      </CardContent>
    </Card>
  );
}
