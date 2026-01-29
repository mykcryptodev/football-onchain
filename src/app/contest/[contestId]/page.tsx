"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ZERO_ADDRESS } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";

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
import { boxes, chain, contests } from "@/constants";
import { isMiniAppAdded } from "@/hooks/useAddMiniApp";
import { useClaimBoxes } from "@/hooks/useClaimBoxes";
import { useContestData } from "@/hooks/useContestData";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useGameDetails } from "@/hooks/useGameDetails";

export default function ContestPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contestId = params.contestId as string;
  const account = useActiveAccount();

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
  const autoOpenKeyRef = useRef<string | null>(null);

  // Check if user is in mini app
  const { isInMiniApp } = useFarcasterContext();

  const ownedBoxesCount = useMemo(() => {
    const address = account?.address?.toLowerCase();
    if (!address) return 0;

    return boxOwners.filter(
      box => box.owner.toLowerCase() === address && box.owner !== ZERO_ADDRESS,
    ).length;
  }, [account?.address, boxOwners]);

  const openseaCollectionUrl = useMemo(() => {
    if (!account?.address || ownedBoxesCount === 0) return null;
    const chainSlug = chain.id === baseSepolia.id ? "base-sepolia" : "base";
    const openseaBaseUrl =
      chain.id === baseSepolia.id
        ? "https://testnets.opensea.io"
        : "https://opensea.io";
    return `${openseaBaseUrl}/assets/${chainSlug}/${
      boxes[chain.id]
    }?search[owner]=${account.address}`;
  }, [account?.address, ownedBoxesCount]);

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

  useEffect(() => {
    if (!contest) return;

    const boxTokenIdParam = searchParams.get("boxTokenId");
    const ownerParam = searchParams.get("owner");

    if (!boxTokenIdParam || !ownerParam) return;

    const parsedTokenId = Number(boxTokenIdParam);
    if (!Number.isFinite(parsedTokenId)) return;

    const autoOpenKey = `${parsedTokenId}-${ownerParam}`;
    if (autoOpenKeyRef.current === autoOpenKey) return;

    if (
      selectedBoxTokenId === parsedTokenId &&
      selectedUserAddress === ownerParam &&
      isProfileModalOpen
    ) {
      return;
    }

    autoOpenKeyRef.current = autoOpenKey;
    setSelectedUserAddress(ownerParam);
    setSelectedBoxTokenId(parsedTokenId);
    setIsProfileModalOpen(true);
  }, [
    contest,
    isProfileModalOpen,
    searchParams,
    selectedBoxTokenId,
    selectedUserAddress,
  ]);

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
            // Ensure amount is a string (not scientific notation)
            // If it's already a string, use it; if it's a number, convert safely
            amount:
              typeof contest.boxCost.amount === "string"
                ? contest.boxCost.amount
                : contest.boxCost.amount.toString(),
            currency: contest.boxCost.currency,
          },
        },
        // onSuccess callback
        async () => {
          // Clear selected boxes after successful claim
          setSelectedBoxes([]);
          toast.success("Boxes claimed successfully!");

          // Show mini app upsell dialog if user is in mini app and hasn't already added it
          if (isInMiniApp && !isMiniAppAdded()) {
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
        {/* Header */}
        <ContestHeader contest={contest} />

        {/* Stats */}
        <ContestStats contest={contest} />
        {ownedBoxesCount > 0 && openseaCollectionUrl ? (
          <div className="mt-4 flex justify-center">
            <Button asChild variant="outline">
              <Link
                href={openseaCollectionUrl}
                rel="noreferrer"
                target="_blank"
              >
                Sell my box{ownedBoxesCount > 1 ? "es" : ""}
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}

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
            <PayoutsCard
              contest={contest}
              gameScore={gameScore}
              scoreChangeCount={gameScore?.scoringPlays?.length || 0}
            />
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
            if (searchParams.get("boxTokenId") || searchParams.get("owner")) {
              router.replace(`/contest/${contestId}`, { scroll: false });
            }
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
