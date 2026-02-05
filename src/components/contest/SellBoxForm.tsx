"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ZERO_ADDRESS } from "thirdweb";

import { OpenSeaListing } from "@/components/contest/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCancelListing } from "@/hooks/useCancelListing";
import { ListingCurrency, useCreateListing } from "@/hooks/useCreateListing";
import { useTokenPricing } from "@/hooks/useTokenPricing";

interface SellBoxFormProps {
  contestId: number;
  existingListing?: OpenSeaListing | null;
  tokenId: number;
  onSuccess?: () => void;
}

export function SellBoxForm({
  tokenId,
  contestId,
  existingListing,
  onSuccess,
}: SellBoxFormProps) {
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const currency: ListingCurrency = "ETH";

  const {
    createListing,
    isLoading: isCreating,
    isApproving,
    error: createError,
  } = useCreateListing();
  const {
    cancelListing,
    isLoading: isCanceling,
    error: cancelError,
  } = useCancelListing();

  const { pricing } = useTokenPricing(ZERO_ADDRESS);

  const usdValue = parseFloat(price || "0") * (pricing?.priceUsd || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) return;

    try {
      await createListing({
        tokenId,
        price,
        currency,
        contestId,
        durationDays: parseInt(durationDays),
      });
      onSuccess?.();
    } catch (err) {
      console.error("Failed to create listing:", err);
    }
  };

  const handleCancel = async () => {
    if (!existingListing) return;
    try {
      await cancelListing({
        listing: existingListing,
        contestId,
      });
      onSuccess?.();
    } catch (err) {
      console.error("Failed to cancel listing:", err);
    }
  };

  const isPending = isCreating || isApproving || isCanceling;
  const error = createError || cancelError;

  return (
    <div className="space-y-4">
      {existingListing ? (
        <div className="space-y-4">
          <div className="rounded-md bg-amber-500/10 p-4 text-sm text-amber-500">
            This box is currently listed for{" "}
            <span className="font-bold">
              {parseFloat(existingListing.price.current.value) / 1e18}{" "}
              {existingListing.price.current.currency === "ETH"
                ? "ETH"
                : "USDC"}
            </span>
          </div>
          <Button
            className="w-full"
            disabled={isPending}
            variant="destructive"
            onClick={handleCancel}
          >
            {isCanceling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling Listing...
              </>
            ) : (
              "Cancel Listing"
            )}
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col">
                <label className="text-xs text-muted-foreground mb-1">
                  Price in ETH
                </label>
                <Input
                  className="font-mono"
                  disabled={isPending}
                  min="0"
                  placeholder="ETH"
                  step="0.000001"
                  type="number"
                  value={price}
                  onChange={e => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setPrice(val);
                  }}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground mb-1">
                  Expires
                </label>
                <Select
                  disabled={isPending}
                  value={durationDays}
                  onValueChange={setDurationDays}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {price && !isNaN(parseFloat(price)) && (
              <p className="text-right text-xs text-muted-foreground">
                ≈ ${usdValue.toFixed(2)} USD
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
              {error.message}
            </div>
          )}

          <Button
            className="w-full"
            disabled={isPending || !price}
            type="submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isApproving
                  ? "Approving..."
                  : isCreating
                    ? "Creating Listing..."
                    : "Processing..."}
              </>
            ) : (
              "List for Sale"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
