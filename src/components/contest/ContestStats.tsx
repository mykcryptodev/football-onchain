import { Card, CardContent } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useSwapToken } from "@/hooks/useSwapToken";
import { useTokenInfo } from "@/hooks/useTokenInfo";
import { getNetRewards } from "@/lib/payout-utils";

import { SwapModal } from "./SwapModal";
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
    amount: BigInt(Math.floor(getNetRewards(contest.totalRewards))),
    currencyAddress: contest.boxCost.currency,
  });

  // Fetch token metadata using hook
  const { tokenInfo } = useTokenInfo(contest.boxCost.currency);

  // Swap token hook
  const { swap, isSwapping, isModalOpen, closeModal, isInMiniApp } =
    useSwapToken(tokenInfo);

  return (
    <>
      {/* Only render SwapModal for non-mini-app users to avoid conflicts */}
      {!isInMiniApp && (
        <SwapModal
          isOpen={isModalOpen}
          tokenInfo={tokenInfo}
          onClose={closeModal}
        />
      )}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Box Cost
            </div>
            <div className="text-lg sm:text-2xl font-bold">
              {boxCostLoading ? (
                "..."
              ) : (
                <>
                  {boxCostFormatted.split(" ")[0]}{" "}
                  {tokenInfo && (
                    <button
                      className="underline text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSwapping}
                      type="button"
                      onClick={swap}
                    >
                      {tokenInfo.symbol}
                    </button>
                  )}
                  {!tokenInfo && boxCostFormatted.split(" ")[1]}
                </>
              )}
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
              Prize Pool
            </div>
            <div className="text-lg sm:text-2xl font-bold">
              {totalRewardsLoading ? (
                "..."
              ) : (
                <>
                  {totalRewardsFormatted.split(" ")[0]}{" "}
                  {tokenInfo && (
                    <button
                      className="underline text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isSwapping}
                      type="button"
                      onClick={swap}
                    >
                      {tokenInfo.symbol}
                    </button>
                  )}
                  {!tokenInfo && totalRewardsFormatted.split(" ")[1]}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
