import { useMemo } from "react";
import { toTokens } from "thirdweb/utils";

import { Card, CardContent } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useSwapToken } from "@/hooks/useSwapToken";
import { useTokenInfo } from "@/hooks/useTokenInfo";
import { useTokenPricing } from "@/hooks/useTokenPricing";
import { getNetRewards } from "@/lib/payout-utils";

import { SwapModal } from "./SwapModal";
import { Contest } from "./types";

interface ContestStatsProps {
  contest: Contest;
}

export function ContestStats({ contest }: ContestStatsProps) {
  const netRewardsWei = useMemo(
    () => BigInt(Math.floor(getNetRewards(contest.totalRewards))),
    [contest.totalRewards],
  );
  const { formattedValue: boxCostFormatted, isLoading: boxCostLoading } =
    useFormattedCurrency({
      amount: BigInt(contest.boxCost.amount),
      currencyAddress: contest.boxCost.currency,
    });

  const {
    formattedValue: totalRewardsFormatted,
    isLoading: totalRewardsLoading,
  } = useFormattedCurrency({
    amount: netRewardsWei,
    currencyAddress: contest.boxCost.currency,
  });

  // Fetch token metadata using hook
  const { tokenInfo } = useTokenInfo(contest.boxCost.currency);
  const { pricing: tokenPricing, isLoading: tokenPricingLoading } =
    useTokenPricing(contest.boxCost.currency);

  // Swap token hook
  const { swap, isSwapping, isModalOpen, closeModal, isInMiniApp } =
    useSwapToken(tokenInfo);

  const formatUsd = (amount: number) =>
    amount.toLocaleString([], {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });

  const boxCostUsd = useMemo(() => {
    if (!tokenPricing?.priceUsd) return null;
    const tokenAmount = Number(
      toTokens(BigInt(contest.boxCost.amount), tokenPricing.decimals),
    );
    if (!Number.isFinite(tokenAmount)) return null;
    return tokenAmount * tokenPricing.priceUsd;
  }, [contest.boxCost.amount, tokenPricing]);

  const totalRewardsUsd = useMemo(() => {
    if (!tokenPricing?.priceUsd) return null;
    const tokenAmount = Number(toTokens(netRewardsWei, tokenPricing.decimals));
    if (!Number.isFinite(tokenAmount)) return null;
    return tokenAmount * tokenPricing.priceUsd;
  }, [netRewardsWei, tokenPricing]);

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
            {!boxCostLoading &&
              (tokenPricingLoading ? (
                <div className="text-xs text-muted-foreground">...</div>
              ) : (
                boxCostUsd && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {formatUsd(boxCostUsd)}
                  </div>
                )
              ))}
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
            {!totalRewardsLoading &&
              (tokenPricingLoading ? (
                <div className="text-xs text-muted-foreground">...</div>
              ) : (
                totalRewardsUsd && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {formatUsd(totalRewardsUsd)}
                  </div>
                )
              ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
