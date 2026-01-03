"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ZERO_ADDRESS } from "thirdweb";

import {
  BoxOwner,
  CommentSection,
  Contest,
  ContestActions,
  ContestHeader,
  ContestStats,
  FootballGrid,
  GameScore,
  GameScores,
  PayoutsCard,
  UserProfileModal,
} from "@/components/contest";
import { chain, contests } from "@/constants";
import { useClaimBoxes } from "@/hooks/useClaimBoxes";
import { useFetchGameData } from "@/hooks/useFetchGameData";
import { useFetchScoreChanges } from "@/hooks/useFetchScoreChanges";
import { useProcessPayouts } from "@/hooks/useProcessPayouts";
import { useRandomNumbers } from "@/hooks/useRandomNumbers";

export default function ContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [gameScore, setGameScore] = useState<GameScore | null>(null);
  const [boxOwners, setBoxOwners] = useState<BoxOwner[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingContestData, setRefreshingContestData] = useState(false);
  const [refreshingGameScores, setRefreshingGameScores] = useState(false);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(
    null,
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Fetch contest data from API
  useEffect(() => {
    const fetchContestData = async () => {
      setLoading(true);

      try {
        // Fetch contest data from API with cache-busting
        const response = await fetch(
          `/api/contest/${contestId}?t=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch contest data");
        }

        const contestData = await response.json();

        // Convert the API response to our Contest type
        const contest: Contest = {
          id: parseInt(contestData.id),
          gameId: parseInt(contestData.gameId),
          creator: contestData.creator,
          rows: contestData.rows,
          cols: contestData.cols,
          boxCost: {
            currency: contestData.boxCost.currency,
            amount: parseInt(contestData.boxCost.amount),
          },
          boxesCanBeClaimed: contestData.boxesCanBeClaimed,
          payoutsPaid: {
            totalPayoutsMade: contestData.payoutsPaid.totalPayoutsMade,
            totalAmountPaid: parseInt(contestData.payoutsPaid.totalAmountPaid),
          },
          totalRewards: parseInt(contestData.totalRewards),
          boxesClaimed: parseInt(contestData.boxesClaimed),
          randomValuesSet: contestData.randomValuesSet,
          title: contestData.title,
          description: contestData.description,
          payoutStrategy: contestData.payoutStrategy,
          payoutTransactionHash: contestData.payoutTransactionHash || null,
        };

        // Fetch real game score from oracle
        let gameScore: GameScore | null = null;
        try {
          const gameScoreResponse = await fetch(
            `/api/games/${contestData.gameId}/scores`,
          );
          if (gameScoreResponse.ok) {
            gameScore = await gameScoreResponse.json();
          } else {
            console.warn("Failed to fetch game scores, using fallback");
            // Fallback to mock data if oracle is unavailable
            gameScore = {
              id: parseInt(contestData.gameId),
              homeQ1LastDigit: 0,
              homeQ2LastDigit: 0,
              homeQ3LastDigit: 0,
              homeFLastDigit: 0,
              awayQ1LastDigit: 0,
              awayQ2LastDigit: 0,
              awayQ3LastDigit: 0,
              awayFLastDigit: 0,
              qComplete: 0,
              requestInProgress: false,
            };
          }
        } catch (error) {
          console.error("Error fetching game scores:", error);
          // Fallback to mock data if oracle is unavailable
          gameScore = {
            id: parseInt(contestData.gameId),
            homeQ1LastDigit: 0,
            homeQ2LastDigit: 0,
            homeQ3LastDigit: 0,
            homeFLastDigit: 0,
            awayQ1LastDigit: 0,
            awayQ2LastDigit: 0,
            awayQ3LastDigit: 0,
            awayFLastDigit: 0,
            qComplete: 0,
            requestInProgress: false,
          };
        }

        // Use real box owners data from API
        const boxOwnersData: BoxOwner[] = contestData.boxes || [];
        setContest(contest);
        setGameScore(gameScore);
        setBoxOwners(boxOwnersData);
      } catch (error) {
        console.error("Error fetching contest data:", error);
        // Keep contest as null to show error state
      } finally {
        setLoading(false);
      }
    };

    fetchContestData();
  }, [contestId]);

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

  const handleClaimedBoxClick = (address: string) => {
    setSelectedUserAddress(address);
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

          // Invalidate cache and refresh contest data to show updated box ownership
          try {
            await invalidateContestCache();
            await handleRefreshContestData();
            toast.success("Boxes claimed successfully!");
          } catch (error) {
            console.error("Error refreshing after claim:", error);
            toast.success(
              "Boxes claimed successfully! (Refresh may be delayed)",
            );
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

  const invalidateContestCache = async () => {
    try {
      const response = await fetch(`/api/contest/${contestId}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chainId: 8453 }), // Base mainnet
      });

      if (!response.ok) {
        throw new Error("Failed to invalidate cache");
      }

      await response.json();
    } catch (error) {
      console.error("Error invalidating cache:", error);
      throw error;
    }
  };

  const handleRefreshContestData = async () => {
    setRefreshingContestData(true);

    try {
      // First invalidate the cache and wait for it to complete
      await invalidateContestCache();

      // Fetch fresh contest data with force refresh
      const response = await fetch(
        `/api/contest/${contestId}?forceRefresh=true&t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch contest data");
      }

      const contestData = await response.json();

      // Convert the API response to our Contest type
      const refreshedContest: Contest = {
        id: parseInt(contestData.id),
        gameId: parseInt(contestData.gameId),
        creator: contestData.creator,
        rows: contestData.rows,
        cols: contestData.cols,
        boxCost: {
          currency: contestData.boxCost.currency,
          amount: parseInt(contestData.boxCost.amount),
        },
        boxesCanBeClaimed: contestData.boxesCanBeClaimed,
        payoutsPaid: {
          totalPayoutsMade: contestData.payoutsPaid.totalPayoutsMade,
          totalAmountPaid: parseInt(contestData.payoutsPaid.totalAmountPaid),
        },
        totalRewards: parseInt(contestData.totalRewards),
        boxesClaimed: parseInt(contestData.boxesClaimed),
        randomValuesSet: contestData.randomValuesSet,
        title: contestData.title,
        description: contestData.description,
        payoutStrategy: contestData.payoutStrategy,
        payoutTransactionHash: contestData.payoutTransactionHash || null,
      };

      // Update box owners with fresh data
      const boxOwnersData: BoxOwner[] = contestData.boxes || [];

      // Update state with fresh data
      setContest(refreshedContest);
      setBoxOwners(boxOwnersData);

      toast.success("Contest data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing contest data:", error);
      toast.error("Failed to refresh contest data. Please try again.");
    } finally {
      setRefreshingContestData(false);
    }
  };

  const handleRefreshGameScores = async () => {
    if (!contest) return;

    setRefreshingGameScores(true);
    try {
      const response = await fetch(
        `/api/games/${contest.gameId}/scores/refresh`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        // Refresh successful, get updated scores from response
        const refreshData = await response.json();
        if (refreshData.gameScore) {
          setGameScore(refreshData.gameScore);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to refresh game scores:", errorData.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error("Error refreshing game scores:", error);
      // You could show a toast notification here
    } finally {
      setRefreshingGameScores(false);
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
          // Refresh contest data to show updated payout information
          try {
            await invalidateContestCache();
            await handleRefreshContestData();
            toast.success("Payouts processed successfully!");
          } catch (error) {
            console.error("Error refreshing after payout processing:", error);
            toast.success(
              "Payouts processed successfully! (Refresh may be delayed)",
            );
          }
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
              isRefreshingContestData={refreshingContestData}
              isRefreshingGameScores={refreshingGameScores}
              isRequestingRandomNumbers={isRequestingRandomNumbers}
              isSyncingScoresOnchain={isSyncingScoresOnchain}
              onFetchScoreChanges={handleFetchScoreChangesOnchain}
              onProcessPayouts={handleProcessPayouts}
              onRefreshContestData={handleRefreshContestData}
              onRefreshGameScores={handleRefreshGameScores}
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
        onOpenChange={setIsProfileModalOpen}
      />
    </div>
  );
}
