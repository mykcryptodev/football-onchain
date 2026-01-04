"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import {
  getPayoutStrategyType,
  getStrategyDescription,
  getStrategyDisplayName,
} from "@/lib/payout-utils";

import { Contest } from "./types";

interface ContestHeaderProps {
  contest: Contest;
}

export function ContestHeader({ contest }: ContestHeaderProps) {
  const { isInMiniApp } = useFarcasterContext();
  const strategyType = getPayoutStrategyType(contest.payoutStrategy);
  const strategyName = getStrategyDisplayName(strategyType);
  const strategyDescription = getStrategyDescription(strategyType);

  const handleShare = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/contest/${contest.id}`;
    const shareMessage = `Check out the "${contest.title}" contest on Football Onchain!`;

    try {
      if (isInMiniApp) {
        const result = await sdk.actions.composeCast({
          text: shareMessage,
          embeds: [shareUrl],
        });

        if (result?.cast) {
          toast.success("Share cast created!");
        } else {
          toast.info("Share cancelled");
        }
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: contest.title,
          text: shareMessage,
          url: shareUrl,
        });
        toast.success("Thanks for sharing!");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Contest link copied to clipboard");
        return;
      }

      toast.error("Sharing is not supported on this device");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        toast.info("Share cancelled");
      } else {
        console.error("Error sharing contest:", error);
        toast.error("Failed to share contest");
      }
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-bold">{contest.title}</h1>
          <p className="text-muted-foreground mt-1">Contest #{contest.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Badge variant={contest.boxesCanBeClaimed ? "default" : "secondary"}>
            {contest.boxesCanBeClaimed ? "Active" : "Closed"}
          </Badge>
          <Badge variant={contest.randomValuesSet ? "default" : "outline"}>
            {contest.randomValuesSet ? "Numbers Set" : "Pending Numbers"}
          </Badge>
          <Badge
            className="bg-blue-50 text-blue-700 border-blue-200"
            variant="outline"
          >
            {strategyName}
          </Badge>
        </div>
      </div>
      {contest.description && (
        <div className="mb-4">
          <p className="text-lg text-muted-foreground">{contest.description}</p>
        </div>
      )}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Payout Strategy:</strong> {strategyDescription}
        </p>
      </div>
    </div>
  );
}
