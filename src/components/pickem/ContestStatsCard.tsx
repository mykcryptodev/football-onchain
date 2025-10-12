import { Calendar, HandCoins, Trophy, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";

interface ContestStatsCardProps {
  entryFee: bigint;
  currency: string;
  totalPrizePool: bigint;
  totalEntries: number;
  payoutType: string;
  entryFeeUsd?: number;
  showTitle?: boolean;
  showCard?: boolean;
  className?: string;
}

export default function ContestStatsCard({
  entryFee,
  currency,
  totalPrizePool,
  totalEntries,
  payoutType,
  entryFeeUsd,
  showTitle = true,
  showCard = true,
  className = "",
}: ContestStatsCardProps) {
  const { formattedValue: formattedEntryFee, isLoading: entryFeeLoading } =
    useFormattedCurrency({
      amount: entryFee,
      currencyAddress: currency,
    });

  const { formattedValue: formattedPrizePool, isLoading: prizePoolLoading } =
    useFormattedCurrency({
      amount: totalPrizePool,
      currencyAddress: currency,
    });

  const content = (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${!showCard ? className : ""}`}
    >
      <div className="flex items-center gap-2 w-full">
        <div className="w-full">
          <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <HandCoins className="h-4 w-4 text-muted-foreground" />
            Entry Fee
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="font-medium">
              {entryFeeLoading ? "..." : formattedEntryFee}
            </div>
            {entryFeeUsd && (
              <span className="text-xs text-muted-foreground justify-end flex-shrink-0">
                $
                {entryFeeUsd.toLocaleString([], {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="w-full">
          <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Prize Pool
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="font-medium">
              {prizePoolLoading ? "..." : formattedPrizePool}
            </div>
            {entryFeeUsd && (
              <span className="text-xs text-muted-foreground justify-end flex-shrink-0">
                $
                {(entryFeeUsd * totalEntries).toLocaleString([], {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="w-full">
          <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Entries</p>
          </div>
          <div className="w-full">
            <p className="font-medium w-full">{totalEntries}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="w-full">
          <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Payout</p>
          </div>
          <div className="w-full">
            <p className="font-medium w-full">{payoutType}</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle>Contest Details</CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-6"}>{content}</CardContent>
    </Card>
  );
}
