"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BoxOwner,
  Contest,
  ContestActions,
  ContestHeader,
  ContestStats,
  FootballGrid,
  GameScore,
  GameScores,
  PayoutsCard,
} from "@/components/contest";
import { chain, contests } from "@/constants";
import { useClaimBoxes } from "@/hooks/useClaimBoxes";
import { useRandomNumbers } from "@/hooks/useRandomNumbers";
import { useParams } from "next/navigation";
import { ZERO_ADDRESS } from "thirdweb";

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

  console.log("contest", contest);
  console.log("boxOwners state", boxOwners.length, boxOwners);

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
        console.log("Raw API response:", contestData);
        console.log("API response has boxes field:", "boxes" in contestData);
        console.log("API boxes data:", contestData.boxes?.length || 0);

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
        console.log("Received boxes data from API:", boxOwnersData.length);
        console.log("Raw boxes data:", contestData.boxes);
        if (boxOwnersData.length > 0) {
          console.log("Sample box from API:", boxOwnersData[0]);
          console.log(
            "Owned boxes from API:",
            boxOwnersData.filter(
              box => box.owner !== "0x0000000000000000000000000000000000000000",
            ).length,
          );
        }

        console.log("Setting contest state:", contest);
        console.log("Setting boxOwners state:", boxOwnersData.length, "boxes");

        setContest(contest);
        setGameScore(gameScore);
        setBoxOwners(boxOwnersData);

        console.log(
          "State set - contest:",
          contest?.id,
          "boxOwners:",
          boxOwnersData.length,
        );
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
      console.log(
        `Box ${boxPosition} (token ${actualTokenId}) is already owned by a real user:`,
        box?.owner,
      );
      return; // Already claimed by a real user
    }

    console.log(
      `Box ${boxPosition} (token ${actualTokenId}) is claimable, toggling selection`,
    );

    setSelectedBoxes(prev => {
      if (prev.includes(boxPosition)) {
        return prev.filter(id => id !== boxPosition);
      } else {
        return [...prev, boxPosition];
      }
    });
  };

  const { handleRequestRandomNumbers, isLoading: isRequestingRandomNumbers } =
    useRandomNumbers();

  const {
    handleClaimBoxes: claimBoxes,
    isLoading: isClaimingBoxes,
    error: claimError,
  } = useClaimBoxes();

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
        contest,
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

      const result = await response.json();
      console.log("Cache invalidated:", result);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      throw error;
    }
  };

  const handleRefreshContestData = async () => {
    setRefreshingContestData(true);

    try {
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
      console.log("Refreshed contest data:", contestData);

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
      };

      // Update box owners with fresh data
      const boxOwnersData: BoxOwner[] = contestData.boxes || [];

      setContest(refreshedContest);
      setBoxOwners(boxOwnersData);
    } catch (error) {
      console.error("Error refreshing contest data:", error);
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

  const handleProcessPayouts = () => {
    // TODO: Implement payout processing logic
    console.log("Processing payouts for contest:", contestId);
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
              The contest you're looking for doesn't exist.
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
              contest={contest}
              boxOwners={boxOwners}
              gameScore={gameScore}
              selectedBoxes={selectedBoxes}
              onBoxClick={handleBoxClick}
              onClaimBoxes={handleClaimBoxes}
              isClaimingBoxes={isClaimingBoxes}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Scores */}
            {gameScore && (
              <GameScores
                gameScore={gameScore}
                contest={contest}
                boxOwners={boxOwners}
              />
            )}

            {/* Payouts */}
            <PayoutsCard contest={contest} />

            {/* Contest Actions */}
            <ContestActions
              contest={contest}
              onRequestRandomNumbers={() =>
                handleRequestRandomNumbers(parseInt(contestId))
              }
              onRefreshContestData={handleRefreshContestData}
              onRefreshGameScores={handleRefreshGameScores}
              onProcessPayouts={handleProcessPayouts}
              onViewTransactionHistory={handleViewTransactionHistory}
              isRequestingRandomNumbers={isRequestingRandomNumbers}
              isRefreshingContestData={refreshingContestData}
              isRefreshingGameScores={refreshingGameScores}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
