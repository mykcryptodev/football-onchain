"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { CircleHelp, Cog, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appName } from "@/constants";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";

import { Contest } from "./types";

interface ContestHeaderProps {
  contest: Contest;
}

export function ContestHeader({ contest }: ContestHeaderProps) {
  const { isInMiniApp } = useFarcasterContext();

  const handleShare = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/contest/${contest.id}`;
    const shareMessage = `Check out the "${contest.title}" contest on ${appName}!`;

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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={contest.boxesCanBeClaimed ? "default" : "secondary"}>
            {contest.boxesCanBeClaimed ? "Active" : "Closed"}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/contest/${contest.id}/faq`}>
              <CircleHelp className="h-4 w-4 mr-2" />
              FAQ
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/contests/${contest.id}/admin`}>
              <Cog className="h-4 w-4 mr-2" />
              Admin
            </Link>
          </Button>
        </div>
      </div>
      {contest.description && (
        <div className="mb-4">
          <p className="text-lg text-muted-foreground">{contest.description}</p>
        </div>
      )}
    </div>
  );
}
