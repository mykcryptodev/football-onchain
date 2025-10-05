import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PayoutStrategyType } from "./types";

interface PayoutStrategyInfoProps {
  strategyType: PayoutStrategyType;
  totalPot?: number; // Optional: to show actual amounts
}

export function PayoutStrategyInfo({
  strategyType,
  totalPot = 1000,
}: PayoutStrategyInfoProps) {
  const formatAmount = (percentage: number) => {
    return totalPot
      ? `${((totalPot * percentage) / 100).toFixed(2)} ETH`
      : `${percentage}%`;
  };

  if (strategyType === PayoutStrategyType.QUARTERS_ONLY) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quarters Only Strategy</CardTitle>
            <Badge variant="outline">Simple</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Payouts are made at the end of each quarter. Winners can claim
            immediately after each quarter ends.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Q1:</span>
              <span className="font-medium">{formatAmount(15)}</span>
            </div>
            <div className="flex justify-between">
              <span>Q2:</span>
              <span className="font-medium">{formatAmount(20)}</span>
            </div>
            <div className="flex justify-between">
              <span>Q3:</span>
              <span className="font-medium">{formatAmount(15)}</span>
            </div>
            <div className="flex justify-between">
              <span>Final:</span>
              <span className="font-medium">{formatAmount(50)}</span>
            </div>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <strong>Timing:</strong> Immediate payouts as quarters complete
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Score Changes + Quarters</CardTitle>
          <Badge variant="outline">Advanced</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Payouts for every score change plus quarters. All payouts are made
          only after the game is completely finished.
        </p>

        {/* Score Changes Section */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Score Changes:</span>
            <span>{formatAmount(50)}</span>
          </div>
          <div className="pl-4 text-sm text-muted-foreground">
            Divided evenly among all score change winners
          </div>
        </div>

        {/* Quarters Section */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Quarters:</span>
            <span>{formatAmount(50)}</span>
          </div>
          <div className="pl-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Q1:</span>
              <span>{formatAmount(7.5)}</span>
            </div>
            <div className="flex justify-between">
              <span>Q2:</span>
              <span>{formatAmount(10)}</span>
            </div>
            <div className="flex justify-between">
              <span>Q3:</span>
              <span>{formatAmount(7.5)}</span>
            </div>
            <div className="flex justify-between">
              <span>Final:</span>
              <span>{formatAmount(25)}</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <strong>Timing:</strong> All payouts after game completion
          <br />
          <strong>Bonus:</strong> Quarter winners who also won on score changes
          get both payouts
        </div>
      </CardContent>
    </Card>
  );
}
