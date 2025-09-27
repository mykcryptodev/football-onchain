"use client";

import { useEffect, useState } from "react";

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
import { useRandomNumbers } from "@/hooks/useRandomNumbers";
import { useParams } from "next/navigation";

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

  // Fetch contest data from API
  useEffect(() => {
    const fetchContestData = async () => {
      setLoading(true);

      try {
        // Fetch contest data from API
        const response = await fetch(`/api/contest/${contestId}`);

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

        // Mock box owners for now
        const mockBoxOwners: BoxOwner[] = Array.from(
          { length: 100 },
          (_, i) => ({
            tokenId: i,
            owner:
              i < parseInt(contestData.boxesClaimed)
                ? `0x${Math.random().toString(16).substr(2, 40)}`
                : "0x0000000000000000000000000000000000000000",
            row: Math.floor(i / 10),
            col: i % 10,
          }),
        );

        setContest(contest);
        setGameScore(gameScore);
        setBoxOwners(mockBoxOwners);
      } catch (error) {
        console.error("Error fetching contest data:", error);
        // Keep contest as null to show error state
      } finally {
        setLoading(false);
      }
    };

    fetchContestData();
  }, [contestId]);

  const handleBoxClick = (tokenId: number) => {
    if (!contest?.boxesCanBeClaimed) return;

    const box = boxOwners.find(b => b.tokenId === tokenId);
    if (box?.owner !== "0x0000000000000000000000000000000000000000") return; // Already claimed

    setSelectedBoxes(prev => {
      if (prev.includes(tokenId)) {
        return prev.filter(id => id !== tokenId);
      } else {
        return [...prev, tokenId];
      }
    });
  };

  const handleClaimBoxes = () => {
    // TODO: Implement box claiming logic
    console.log("Claiming boxes:", selectedBoxes);
  };

  const { handleRequestRandomNumbers, isLoading: isRequestingRandomNumbers } =
    useRandomNumbers();

  const handleRefreshContestData = async () => {
    setRefreshingContestData(true);

    try {
      // Call the refresh endpoint to bust cache and get fresh data
      const response = await fetch(`/api/contest/${contestId}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh contest data");
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
      };

      setContest(refreshedContest);
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
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Scores */}
            {gameScore && <GameScores gameScore={gameScore} />}

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
