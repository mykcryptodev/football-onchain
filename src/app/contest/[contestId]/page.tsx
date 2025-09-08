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
import { useParams } from "next/navigation";

export default function ContestPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [gameScore, setGameScore] = useState<GameScore | null>(null);
  const [boxOwners, setBoxOwners] = useState<BoxOwner[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

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
          rows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // TODO: Fetch from contract
          cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // TODO: Fetch from contract
          boxCost: {
            currency: contestData.boxCost.currency,
            amount: parseInt(contestData.boxCost.amount),
          },
          boxesCanBeClaimed: contestData.boxesCanBeClaimed,
          rewardsPaid: contestData.rewardsPaid,
          totalRewards: parseInt(contestData.totalRewards),
          boxesClaimed: parseInt(contestData.boxesClaimed),
          randomValuesSet: contestData.randomValuesSet,
          title: contestData.title,
          description: contestData.description,
        };

        // TODO: Fetch game score and box owners from separate API endpoints
        const mockGameScore: GameScore = {
          id: parseInt(contestData.gameId),
          homeQ1LastDigit: 7,
          homeQ2LastDigit: 4,
          homeQ3LastDigit: 1,
          homeFLastDigit: 8,
          awayQ1LastDigit: 3,
          awayQ2LastDigit: 0,
          awayQ3LastDigit: 7,
          awayFLastDigit: 4,
          qComplete: 2, // Q1 and Q2 complete
          requestInProgress: false,
        };

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
        setGameScore(mockGameScore);
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

  const handleRequestRandomNumbers = () => {
    // TODO: Implement random number request logic
    console.log("Requesting random numbers for contest:", contestId);
  };

  const handleRefreshGameScores = () => {
    // TODO: Implement game score refresh logic
    console.log("Refreshing game scores for contest:", contestId);
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
              onRequestRandomNumbers={handleRequestRandomNumbers}
              onRefreshGameScores={handleRefreshGameScores}
              onViewTransactionHistory={handleViewTransactionHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
