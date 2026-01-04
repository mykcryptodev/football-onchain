import { Card, CardContent } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";

import { Contest } from "./types";

interface ContestStatsProps {
  contest: Contest;
}

export function ContestStats({ contest }: ContestStatsProps) {
  const { formattedValue: boxCostFormatted, isLoading: boxCostLoading } =
    useFormattedCurrency({
      amount: BigInt(contest.boxCost.amount),
      currencyAddress: contest.boxCost.currency,
    });

  const {
    formattedValue: totalRewardsFormatted,
    isLoading: totalRewardsLoading,
  } = useFormattedCurrency({
    amount: BigInt(contest.totalRewards),
    currencyAddress: contest.boxCost.currency,
  });

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Box Cost
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {boxCostLoading ? "..." : boxCostFormatted}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Boxes Claimed
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {contest.boxesClaimed}/100
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Total Prize Pool
          </div>
          <div className="text-lg sm:text-2xl font-bold">
            {totalRewardsLoading ? "..." : totalRewardsFormatted}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
