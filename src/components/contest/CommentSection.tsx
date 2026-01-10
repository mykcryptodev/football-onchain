"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/hooks/useComments";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";

interface CommentSectionProps {
  contestId: string;
}

export function CommentSection({ contestId }: CommentSectionProps) {
  const {
    comments,
    isLoading: loading,
    isRefreshing: refreshing,
    refresh,
  } = useComments(contestId);
  const { isInMiniApp } = useIsInMiniApp();

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contestUrl = `${baseUrl}/contest/${contestId}`;

  const handleAddComment = async () => {
    if (isInMiniApp) {
      try {
        const result = await sdk.actions.composeCast({
          text: `Commenting on contest ${contestId}`,
          embeds: [contestUrl],
          parent: {
            // @ts-expect-error - TODO: trying
            type: "url",
            url: contestUrl,
          },
        });

        if (result?.cast) {
          toast.success(
            "Cast posted! It may take a moment to appear as a comment.",
          );
          // Refresh comments after posting
          setTimeout(() => refresh(), 3000);
        } else {
          toast.info("Comment cancelled");
        }
      } catch (error) {
        console.error("Error composing cast:", error);
        toast.error("Failed to compose comment");
      }
    } else {
      // Fallback for non-miniapp: open Warpcast compose in new window
      const warpcastUrl = `https://farcaster.xyz/~/compose?text=&embeds[]=${encodeURIComponent(contestUrl)}`;
      window.open(warpcastUrl, "_blank");
      toast.info("Opening Warpcast to compose comment");
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            disabled={refreshing}
            size="sm"
            variant="outline"
            onClick={refresh}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button size="sm" onClick={handleAddComment}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              No comments yet. Be the first to comment on this contest!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map(cast => (
              <div key={cast.hash} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={cast.author.pfp_url} />
                  <AvatarFallback>
                    {cast.author.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {cast.author.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{cast.author.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(cast.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {cast.text}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{cast.reactions.likes_count} likes</span>
                    <span>{cast.reactions.recasts_count} recasts</span>
                  </div>
                </div>
              </div>
            ))}
            {/* Note: Load More functionality would need pagination support in the hook */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
