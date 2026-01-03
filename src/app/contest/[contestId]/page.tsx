"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ZERO_ADDRESS } from "thirdweb";

import {
  CommentSection,
  ContestActions,
  ContestHeader,
  ContestStats,
  FootballGrid,
  GameScores,
  PayoutsCard,
  UserProfileModal,
} from "@/components/contest";
import { chain, contests } from "@/constants";
import { useClaimBoxes } from "@/hooks/useClaimBoxes";
import { useContestData } from "@/hooks/useContestData";
import { useFetchGameData } from "@/hooks/useFetchGameData";
import { useFetchScoreChanges } from "@/hooks/useFetchScoreChanges";
import { useProcessPayouts } from "@/hooks/useProcessPayouts";
import { useRandomNumbers } from "@/hooks/useRandomNumbers";

export default function ContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;

  // Use the new useContestData hook for data fetching and caching
  const {
    contest,
    gameScore,
    boxOwners,
    isLoading: loading,
    isRefreshing,
    refreshContestData,
    refreshGameScores,
  } = useContestData(contestId);

  // Local UI state
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(
    null,
  );
  const [selectedBoxTokenId, setSelectedBoxTokenId] = useState<number | null>(
    null,
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleBoxClick = (boxPosition: number) => {
    if (!contest?.boxesCanBeClaimed) return;

    // Calculate the actual NFT token ID from the box position
    const actualTokenId = contest.id * 100 + boxPosition;
    const box = boxOwners.find(b => b.tokenId === actualTokenId);

    // Allow clicking if box is unowned (zero address) OR owned by contest contract
    const isClaimable =
      !box ||
      box.owner === ZERO_ADDRESS ||
      box.owner.toLowerCase() === contests[chain.id].toLowerCase();

    if (!isClaimable) {
      return; // Already claimed by a real user
    }

    setSelectedBoxes(prev => {
      if (prev.includes(boxPosition)) {
        return prev.filter(id => id !== boxPosition);
      } else {
        return [...prev, boxPosition];
      }
    });
  };

  const handleClaimedBoxClick = (address: string, tokenId: number) => {
    setSelectedUserAddress(address);
    setSelectedBoxTokenId(tokenId);
    setIsProfileModalOpen(true);
  };

  const { handleRequestRandomNumbers, isLoading: isRequestingRandomNumbers } =
    useRandomNumbers();

  const { handleClaimBoxes: claimBoxes, isLoading: isClaimingBoxes } =
    useClaimBoxes();

  const {
    handleProcessPayouts: processPayouts,
    isLoading: isProcessingPayouts,
  } = useProcessPayouts();

  const { handleFetchGameData, isLoading: isSyncingScoresOnchain } =
    useFetchGameData();

  const {
    handleFetchScoreChanges: fetchScoreChanges,
    isLoading: isFetchingScoreChanges,
  } = useFetchScoreChanges();

  const handleClaimBoxes = async () => {
    if (!selectedBoxes || selectedBoxes.length === 0) {
      console.warn("No boxes selected to claim");
      return;
    }

    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await claimBoxes(
        selectedBoxes,
        contest.id,
        undefined,
        {
          boxCost: {
            amount: contest.boxCost.amount.toString(),
            currency: contest.boxCost.currency,
          },
        },
        // onSuccess callback
        async () => {
          // Clear selected boxes after successful claim
          setSelectedBoxes([]);
          toast.success("Boxes claimed successfully!");
        },
        // onError callback
        error => {
          console.error("Failed to claim boxes:", error);
          toast.error("Failed to claim boxes. Please try again.");
        },
      );
    } catch (error) {
      console.error("Failed to claim boxes:", error);
      toast.error("Failed to claim boxes. Please try again.");
    }
  };

  const handleProcessPayouts = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await processPayouts(
        contest.id,
        // onSuccess callback
        async () => {
          toast.success("Payouts processed successfully!");
        },
        // onError callback
        error => {
          console.error("Failed to process payouts:", error);
          toast.error("Failed to process payouts. Please try again.");
        },
      );
    } catch (error) {
      console.error("Failed to process payouts:", error);
      toast.error("Failed to process payouts. Please try again.");
    }
  };

  const handleSyncScoresOnchain = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await handleFetchGameData(
        contest.gameId,
        "quarter-scores",
        // onSuccess callback
        async () => {
          toast.success(
            "Scores sync initiated successfully! This may take a few minutes to complete.",
          );
        },
        // onError callback
        error => {
          console.error("Failed to sync scores onchain:", error);
          toast.error(
            error.message || "Failed to sync scores onchain. Please try again.",
          );
        },
      );
    } catch (error) {
      console.error("Failed to sync scores onchain:", error);
      toast.error(
        (error as Error).message ||
          "Failed to sync scores onchain. Please try again.",
      );
    }
  };

  const handleFetchScoreChangesOnchain = async () => {
    if (!contest) {
      console.warn("No contest data available");
      return;
    }

    try {
      await fetchScoreChanges(
        contest.gameId,
        // onSuccess callback
        async () => {
          toast.success(
            "Score changes fetch initiated successfully! This may take a few minutes to complete.",
          );
        },
        // onError callback
        error => {
          console.error("Failed to fetch score changes:", error);
          toast.error(
            error.message || "Failed to fetch score changes. Please try again.",
          );
        },
      );
    } catch (error) {
      console.error("Failed to fetch score changes:", error);
      toast.error(
        (error as Error).message ||
          "Failed to fetch score changes. Please try again.",
      );
    }
  };

  const handleViewTransactionHistory = () => {
    // TODO: Implement transaction history view logic
    console.log("Viewing transaction history for contest:", contestId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading contest...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
            <p className="text-muted-foreground">
              The contest you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <ContestHeader contest={contest} />

        {/* Stats */}
        <ContestStats contest={contest} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Football Grid */}
          <div className="lg:col-span-2">
            <FootballGrid
              key={`${contest.id}-${contest.boxesClaimed}-${boxOwners.length}`}
              boxOwners={boxOwners}
              contest={contest}
              gameScore={gameScore}
              isClaimingBoxes={isClaimingBoxes}
              selectedBoxes={selectedBoxes}
              onBoxClick={handleBoxClick}
              onClaimBoxes={handleClaimBoxes}
              onClaimedBoxClick={handleClaimedBoxClick}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Scores */}
            {gameScore && (
              <GameScores
                boxOwners={boxOwners}
                contest={contest}
                gameScore={gameScore}
              />
            )}

            {/* Payouts */}
            <PayoutsCard contest={contest} />

            {/* Contest Actions */}
            <ContestActions
              contest={contest}
              isFetchingScoreChanges={isFetchingScoreChanges}
              isProcessingPayouts={isProcessingPayouts}
              isRefreshingContestData={isRefreshing}
              isRefreshingGameScores={isRefreshing}
              isRequestingRandomNumbers={isRequestingRandomNumbers}
              isSyncingScoresOnchain={isSyncingScoresOnchain}
              onFetchScoreChanges={handleFetchScoreChangesOnchain}
              onProcessPayouts={handleProcessPayouts}
              onRefreshContestData={refreshContestData}
              onRefreshGameScores={refreshGameScores}
              onSyncScoresOnchain={handleSyncScoresOnchain}
              onViewTransactionHistory={handleViewTransactionHistory}
              onRequestRandomNumbers={() =>
                handleRequestRandomNumbers(parseInt(contestId))
              }
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentSection contestId={contestId} />
        </div>
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        address={selectedUserAddress}
        open={isProfileModalOpen}
        onOpenChange={(open) => {
          setIsProfileModalOpen(open);
          if (!open) {
            setSelectedUserAddress(null);
            setSelectedBoxTokenId(null);
          }
        }}
        contest={contest}
        gameScore={gameScore}
        boxTokenId={selectedBoxTokenId}
      />
    </div>
  );
}
