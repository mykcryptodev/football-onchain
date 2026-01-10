"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { AlertCircle, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useComments } from "@/hooks/useComments";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";
import { useNeynarSigner } from "@/hooks/useNeynarSigner";
import { usePostComment } from "@/hooks/usePostComment";

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
  const { context } = useFarcasterContext();
  const [commentText, setCommentText] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contestUrl = `${baseUrl}/contest/${contestId}`;

  // Get user's FID from Farcaster context
  const userFid = context?.user?.fid ?? null;

  // Get signer status for Neynar casting
  const {
    signerStatus,
    signerUuid,
    approvalUrl,
    isLoading: signerLoading,
    refetch: refetchSigner,
  } = useNeynarSigner({
    fid: userFid,
    enabled: isInMiniApp && showComposer,
  });

  const { postComment, isPosting } = usePostComment();

  const handleAddCommentClick = () => {
    setShowComposer(true);
  };

  const handleApproveSignerClick = () => {
    if (approvalUrl) {
      window.open(approvalUrl, "_blank");
      toast.info(
        "Please approve the signer in Warpcast, then come back and try again",
      );
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    // If we have an approved signer, use Neynar API
    if (signerStatus === "approved" && signerUuid) {
      try {
        await postComment({
          text: commentText,
          parentUrl: contestUrl,
          signerUuid,
        });

        toast.success(
          "Comment posted! It may take a moment to appear in the feed.",
        );
        setCommentText("");
        setShowComposer(false);
        // Refresh comments after a short delay
        setTimeout(() => refresh(), 3000);
      } catch (error) {
        console.error("Error posting comment:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to post comment",
        );
      }
    } else {
      // Fallback to composeCast (without parent URL support)
      handleFallbackCompose();
    }
  };

  const handleFallbackCompose = async () => {
    if (isInMiniApp) {
      try {
        const result = await sdk.actions.composeCast({
          text: commentText || `Commenting on contest ${contestId}`,
          embeds: [contestUrl],
        });

        if (result?.cast) {
          toast.success(
            "Cast posted! It may take a moment to appear as a comment.",
          );
          setCommentText("");
          setShowComposer(false);
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
      const warpcastUrl = `https://farcaster.xyz/~/compose?text=${encodeURIComponent(commentText || "")}&embeds[]=${encodeURIComponent(contestUrl)}`;
      window.open(warpcastUrl, "_blank");
      toast.info("Opening Warpcast to compose comment");
      setCommentText("");
      setShowComposer(false);
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
          {!showComposer && (
            <Button size="sm" onClick={handleAddCommentClick}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Comment Composer */}
        {showComposer && (
          <div className="mb-6 space-y-3">
            <Textarea
              placeholder="Write your comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="min-h-[100px]"
              disabled={isPosting}
            />

            {/* Signer approval needed */}
            {signerLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking signer status...
              </div>
            )}

            {signerStatus === "pending_approval" && approvalUrl && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    To post comments with proper threading, you need to approve
                    this app in Warpcast (one-time setup).
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApproveSignerClick}
                    >
                      Approve in Warpcast
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => refetchSigner()}
                    >
                      I've approved it
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSubmitComment}
                disabled={isPosting || !commentText.trim() || signerLoading}
                size="sm"
              >
                {isPosting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowComposer(false);
                  setCommentText("");
                }}
                disabled={isPosting}
                size="sm"
              >
                Cancel
              </Button>
              {signerStatus !== "approved" && (
                <Button
                  variant="ghost"
                  onClick={handleFallbackCompose}
                  disabled={isPosting || !commentText.trim()}
                  size="sm"
                  className="ml-auto"
                >
                  Use Warpcast
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Comments List */}
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
