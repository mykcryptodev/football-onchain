"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ZERO_ADDRESS } from "thirdweb";

import {
  AddMiniAppDialog,
  BoxOwnersSection,
  CommentSection,
  ContestHeader,
  ContestStats,
  FootballGrid,
  GameScores,
  PayoutsCard,
  UserProfileModal,
} from "@/components/contest";
import { Button } from "@/components/ui/button";
import { chain, contests } from "@/constants";
import { useClaimBoxes } from "@/hooks/useClaimBoxes";
import { useContestData } from "@/hooks/useContestData";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useGameDetails } from "@/hooks/useGameDetails";

export default function ContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;

  // Use the new useContestData hook for data fetching and caching
  const {
    contest,
    gameScore,
    boxOwners,
    isLoading: loading,
  } = useContestData(contestId);

  // Fetch game details for additional game information
  const { data: gameDetails } = useGameDetails(contest?.gameId);

  // Local UI state
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(
    null,
  );
  const [selectedBoxTokenId, setSelectedBoxTokenId] = useState<number | null>(
    null,
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddMiniAppDialogOpen, setIsAddMiniAppDialogOpen] = useState(false);

  // Check if user is in mini app
  const { isInMiniApp } = useFarcasterContext();

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

  const { handleClaimBoxes: claimBoxes, isLoading: isClaimingBoxes } =
    useClaimBoxes();

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

          // Show mini app upsell dialog if user is in mini app
          if (isInMiniApp) {
            setIsAddMiniAppDialogOpen(true);
          }
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
        {/* Test Button - Remove in production */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setIsAddMiniAppDialogOpen(true)}
          >
            Test: Open Add Mini App Dialog
          </Button>
        </div>

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
                gameDetails={gameDetails ?? null}
                gameScore={gameScore}
              />
            )}

            {/* Payouts */}
            <PayoutsCard contest={contest} />
          </div>
        </div>

        <div className="mt-8">
          <BoxOwnersSection boxOwners={boxOwners} contest={contest} />
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentSection contestId={contestId} />
        </div>
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        address={selectedUserAddress}
        boxTokenId={selectedBoxTokenId}
        contest={contest}
        gameScore={gameScore}
        open={isProfileModalOpen}
        onOpenChange={open => {
          setIsProfileModalOpen(open);
          if (!open) {
            setSelectedUserAddress(null);
            setSelectedBoxTokenId(null);
          }
        }}
      />

      {/* Add Mini App Dialog - shown after successful box purchase */}
      <AddMiniAppDialog
        open={isAddMiniAppDialogOpen}
        onOpenChange={setIsAddMiniAppDialogOpen}
      />
    </div>
  );
}
