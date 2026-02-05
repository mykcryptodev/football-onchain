"use client";

import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { toTokens, ZERO_ADDRESS } from "thirdweb";

import { OpenSeaListing } from "@/components/contest/types";
import { Button } from "@/components/ui/button";
import { chain, usdc } from "@/constants";
import { useFulfillOrder } from "@/hooks/useFulfillOrder";
import { useTokenPricing } from "@/hooks/useTokenPricing";

interface BuyBoxSectionProps {
  listing: OpenSeaListing;
  contestId: number;
  currentUserAddress?: string;
  onSuccess?: () => void;
}

export function BuyBoxSection({
  listing,
  contestId,
  currentUserAddress,
  onSuccess,
}: BuyBoxSectionProps) {
  const { fulfillOrder, isLoading, isApproving, error } = useFulfillOrder();

  const currencyAddress = listing.price.current.currency;
  const { pricing } = useTokenPricing(currencyAddress);

  const isPrivateListing = listing.taker !== null && listing.taker?.address;
  const isReservedForUser =
    isPrivateListing &&
    currentUserAddress &&
    listing.taker?.address.toLowerCase() === currentUserAddress.toLowerCase();

  const handleBuy = async () => {
    try {
      await fulfillOrder({ listing, contestId });
      onSuccess?.();
    } catch (err) {
      console.error("Purchase failed:", err);
    }
  };

  const formattedPrice = useMemo(() => {
    try {
      return toTokens(
        BigInt(listing.price.current.value),
        listing.price.current.decimals,
      );
    } catch (e) {
      console.error("Error formatting price:", e);
      return "0";
    }
  }, [listing.price]);

  const currencySymbol = useMemo(() => {
    if (
      listing.price.current.currency.toLowerCase() ===
      usdc[chain.id]?.toLowerCase()
    ) {
      return "USDC";
    }
    if (listing.price.current.currency === ZERO_ADDRESS) {
      return "ETH";
    }
    return "ETH";
  }, [listing.price]);

  const usdValue = useMemo(() => {
    if (!pricing?.priceUsd) return null;
    const numericPrice = Number(formattedPrice);
    if (isNaN(numericPrice)) return null;
    return (numericPrice * pricing.priceUsd).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }, [formattedPrice, pricing]);

  if (isPrivateListing && !isReservedForUser) {
    return (
      <div className="rounded-lg bg-amber-500/10 p-4 text-center border border-amber-500/20">
        <p className="text-sm font-medium text-amber-500">
          Reserved for another buyer
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {listing.taker?.address.slice(0, 6)}...
          {listing.taker?.address.slice(-4)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Price</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formattedPrice} {currencySymbol}
            </span>
            {usdValue && (
              <span className="text-sm text-muted-foreground">
                ({usdValue})
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
          {error.message || "Failed to complete purchase"}
        </div>
      )}

      <Button
        className="w-full font-bold"
        disabled={isLoading}
        size="lg"
        onClick={handleBuy}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isApproving ? "Approving USDC..." : "Purchasing..."}
          </>
        ) : (
          "Buy Now"
        )}
      </Button>
    </div>
  );
}
