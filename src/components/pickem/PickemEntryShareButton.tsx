"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { appName } from "@/constants";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";

/** Shares the public entry page for one Pick'em entry. */
export default function PickemEntryShareButton({
  contestId,
  tokenId,
}: {
  contestId: number | string;
  tokenId: number | string;
}) {
  const { isInMiniApp } = useFarcasterContext();

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/pickem/${contestId}/entries/${tokenId}`;
    const shareText = `Check out these Pick'em picks on ${appName}`;

    try {
      if (isInMiniApp) {
        await sdk.actions.composeCast({ text: shareText, embeds: [shareUrl] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Entry link copied to clipboard");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error("Error sharing entry:", error);
      toast.error("Failed to share entry");
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" />
      Share
    </Button>
  );
}
