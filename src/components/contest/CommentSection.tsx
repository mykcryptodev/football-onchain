"use client";

import { AlertCircle, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useEthComments } from "@/hooks/useEthComments";
import { usePostEthComment } from "@/hooks/usePostEthComment";

interface CommentSectionProps {
  contestId: string;
}

export function CommentSection({ contestId }: CommentSectionProps) {
  const {
    comments,
    isLoading: loading,
    isRefreshing: refreshing,
    refresh,
  } = useEthComments(contestId);
  const account = useActiveAccount();
  const [commentText, setCommentText] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const contestUrl = `${baseUrl}/contest/${contestId}`;

  const { postComment, isPosting } = usePostEthComment();

  const handleAddCommentClick = () => {
    if (!account?.address) {
      toast.error("Please connect your wallet to comment");
      return;
    }
    setShowComposer(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    if (!account?.address) {
      toast.error("Please connect your wallet to comment");
      return;
    }

    try {
      await postComment({
        content: commentText,
        targetUri: contestUrl,
      });

      toast.success(
        "Comment posted! It may take a moment to appear in the feed.",
      );
      setCommentText("");
      setShowComposer(false);
      // Refresh comments after a short delay to allow indexer to process
      setTimeout(() => refresh(), 3000);
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to post comment",
      );
    }
  };

  const formatRelativeTime = (timestamp: string | number | Date) => {
    const now = new Date();
    const then =
      timestamp instanceof Date
        ? timestamp
        : new Date(
            typeof timestamp === "number" ? timestamp * 1000 : timestamp,
          );
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

  const getAuthorDisplayName = (comment: (typeof comments)[0]) => {
    // Priority: ENS > Farcaster displayName > Farcaster username > shortened address
    if (comment.author.ens?.name) {
      return comment.author.ens.name;
    }
    if (comment.author.farcaster?.displayName) {
      return comment.author.farcaster.displayName;
    }
    if (comment.author.farcaster?.username) {
      return `@${comment.author.farcaster.username}`;
    }
    // Shorten address to 0x1234...5678 format
    const addr = comment.author.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getAuthorUsername = (comment: (typeof comments)[0]) => {
    // Show farcaster username or shortened address
    if (comment.author.farcaster?.username) {
      return `@${comment.author.farcaster.username}`;
    }
    const addr = comment.author.address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getAuthorAvatar = (comment: (typeof comments)[0]) => {
    // Priority: ENS avatar > Farcaster pfp
    if (comment.author.ens?.avatarUrl) {
      return comment.author.ens.avatarUrl;
    }
    if (comment.author.farcaster?.pfpUrl) {
      return comment.author.farcaster.pfpUrl;
    }
    return undefined;
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
          <Button size="sm" onClick={handleAddCommentClick}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Comment Composer */}
        {showComposer && (
          <div className="mb-6 space-y-3">
            <Textarea
              className="min-h-[100px]"
              disabled={isPosting}
              placeholder="Write your comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />

            {!account?.address && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  Please connect your wallet to post comments.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                disabled={isPosting || !commentText.trim() || !account?.address}
                size="sm"
                onClick={handleSubmitComment}
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
                disabled={isPosting}
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowComposer(false);
                  setCommentText("");
                }}
              >
                Cancel
              </Button>
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
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAuthorAvatar(comment)} />
                  <AvatarFallback>
                    {getAuthorDisplayName(comment)[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {getAuthorDisplayName(comment)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getAuthorUsername(comment)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
