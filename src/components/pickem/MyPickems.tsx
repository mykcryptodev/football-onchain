"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePickemContract } from "@/hooks/usePickemContract";
import {
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import { formatEther } from "viem";
import PickemLeaderboard from "./PickemLeaderboard";

interface PickemNFT {
  tokenId: number;
  contestId: number;
  seasonType: number;
  weekNumber: number;
  year: number;
  picks: number[];
  gameIds: string[];
  correctPicks: number;
  totalGames: number;
  tiebreakerPoints: number;
  submissionTime: number;
  prizeWon: bigint;
  claimed: boolean;
  rank?: number;
  contest?: any; // Full contest object
}

export default function MyPickems() {
  const account = useActiveAccount();
  const {
    getUserNFTBalance,
    getUserNFTByIndex,
    getNFTPrediction,
    getContest,
    claimPrize,
    getUserContests,
    getContestWinners,
    updateContestResults,
  } = usePickemContract();
  const [nfts, setNfts] = useState<PickemNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<number | null>(null);

  // Add state for finalizing
  const [finalizing, setFinalizing] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (account?.address) {
      fetchUserNFTs();
    } else {
      setNfts([]);
      setLoading(false);
    }
  }, [account]);

  const fetchUserNFTs = async () => {
    if (!account?.address) return;

    try {
      // Get user's NFT balance
      const balance = await getUserNFTBalance(account.address);
      const userNFTs: PickemNFT[] = [];

      // Fetch all user's NFT tokens
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await getUserNFTByIndex(account.address, i);
          const predictionData = await getNFTPrediction(tokenId);

          // Destructure the tuple: [contestId, predictor, submissionTime, tiebreakerPoints, correctPicks, claimed]
          // Note: Solidity auto-generated getters don't return arrays from structs
          const [
            contestId,
            predictor,
            submissionTime,
            tiebreakerPoints,
            correctPicks,
            claimed,
          ] = predictionData;

          // Get contest details to get more info
          const contest = await getContest(Number(contestId));

          // Fetch winners to determine eligibility and rank
          const winners = await getContestWinners(Number(contestId));
          const isWinner = winners.includes(BigInt(tokenId));
          let prizeWon = BigInt(0);
          let rank = 0;

          if (isWinner && contest.totalPrizePool > BigInt(0)) {
            // Simple calculation: for now, assume equal split among winners for tiered; adjust based on payoutType
            const numWinners = winners.length;
            const treasuryFee =
              (contest.totalPrizePool * BigInt(500)) / BigInt(10000); // 5% example; use actual TREASURY_FEE
            const netPool = contest.totalPrizePool - treasuryFee;
            prizeWon = netPool / BigInt(numWinners);
            rank = winners.indexOf(BigInt(tokenId)) + 1; // Approximate rank
          }

          userNFTs.push({
            tokenId: Number(tokenId),
            contestId: Number(contestId),
            seasonType: Number(contest.seasonType),
            weekNumber: Number(contest.weekNumber),
            year: Number(contest.year),
            picks: [], // Pick arrays not returned from Solidity struct getter
            gameIds: contest.gameIds.map((id: bigint) => id.toString()),
            correctPicks: Number(correctPicks),
            totalGames: contest.gameIds.length,
            tiebreakerPoints: Number(tiebreakerPoints),
            submissionTime: Number(submissionTime) * 1000,
            prizeWon,
            claimed: Boolean(claimed),
            rank,
            contest, // Store full contest object
          });
        } catch (err) {
          console.error(`Error fetching NFT ${i}:`, err);
        }
      }

      setNfts(userNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPrize = async (tokenId: number, contestId: number) => {
    try {
      await claimPrize(contestId, tokenId);
      toast.success("Prize claimed successfully!");
      await fetchUserNFTs(); // Refresh the list
    } catch (error) {
      console.error("Error claiming prize:", error);
      toast.error("Failed to claim prize");
    }
  };

  // Add function
  const handleFinalizeContest = async (contestId: number) => {
    setFinalizing(prev => ({ ...prev, [contestId]: true }));

    try {
      await updateContestResults(contestId);
      toast.success("Contest finalized and winners calculated!");
      await fetchUserNFTs(); // Refresh to show prizes
    } catch (error) {
      console.error("Error finalizing contest:", error);
      toast.error("Failed to finalize contest");
    } finally {
      setFinalizing(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const getStatusBadge = (nft: PickemNFT) => {
    // Check if contest games are finalized first
    if (!nft.contest.gamesFinalized) {
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending Results
        </Badge>
      );
    }

    // If this specific NFT's prize was claimed
    if (nft.claimed) {
      return (
        <Badge variant="secondary">
          <CheckCircle className="h-3 w-3 mr-1" />
          Prize Claimed
        </Badge>
      );
    }

    // If contest payout is complete (all prizes distributed)
    if (nft.contest.payoutComplete) {
      return (
        <Badge variant="secondary">
          <CheckCircle className="h-3 w-3 mr-1" />
          Payout Complete
        </Badge>
      );
    }

    // If eligible for prize but not yet claimed
    if (nft.prizeWon > BigInt(0)) {
      return (
        <Badge variant="default">
          <Trophy className="h-3 w-3 mr-1" />
          Winner - Claim Available
        </Badge>
      );
    }

    // No prize won
    return (
      <Badge variant="outline">
        <XCircle className="h-3 w-3 mr-1" />
        No Prize
      </Badge>
    );
  };

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 75) return "text-green-600 dark:text-green-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Connect your wallet to view your Pick&apos;em NFTs
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Pick&apos;em NFTs Yet</h3>
        <p className="text-muted-foreground">
          Join a contest and make your picks to get started!
        </p>
      </div>
    );
  }

  // Calculate stats
  const totalNFTs = nfts.length;
  const totalWins = nfts.filter(nft => Number(nft.prizeWon) > 0).length;
  const totalPrizes = nfts.reduce((sum, nft) => sum + Number(nft.prizeWon), 0);

  // Only calculate accuracy for finalized contests
  const finalizedNFTs = nfts.filter(nft => nft.contest?.gamesFinalized);
  const avgAccuracy =
    finalizedNFTs.length > 0
      ? finalizedNFTs.reduce(
          (sum, nft) => sum + (Number(nft.correctPicks) / nft.totalGames) * 100,
          0,
        ) / finalizedNFTs.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{totalNFTs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-2xl font-bold">{totalWins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Won</p>
                <p className="text-2xl font-bold">
                  {formatEther(BigInt(totalPrizes))} ETH
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p
                  className={`text-2xl font-bold ${getAccuracyColor(avgAccuracy)}`}
                >
                  {avgAccuracy.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NFT List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All NFTs</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {nfts.map(nft => (
            <Card key={nft.tokenId} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Week {nft.weekNumber} - {nft.year}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      NFT #{nft.tokenId} • Contest #{nft.contestId} •{" "}
                      {!nft.contest.gamesFinalized
                        ? "Pending Finalization"
                        : "Finalized"}
                    </p>
                  </div>
                  {getStatusBadge(nft)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance */}
                {Number(nft.correctPicks) > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Correct Picks</span>
                      <span className="font-medium">
                        {nft.correctPicks} / {nft.totalGames}
                      </span>
                    </div>
                    <Progress
                      value={(Number(nft.correctPicks) / nft.totalGames) * 100}
                      className="h-2"
                    />
                    <p
                      className={`text-sm font-medium ${getAccuracyColor((Number(nft.correctPicks) / nft.totalGames) * 100)}`}
                    >
                      {(
                        (Number(nft.correctPicks) / nft.totalGames) *
                        100
                      ).toFixed(1)}
                      % Accuracy
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tiebreaker</p>
                    <p className="font-medium">{nft.tiebreakerPoints} points</p>
                  </div>
                  {nft.rank && nft.rank > 0 && (
                    <div>
                      <p className="text-muted-foreground">Rank</p>
                      <p className="font-medium">#{nft.rank}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Show finalize button only if games not finalized */}
                  {!nft.contest.gamesFinalized && (
                    <Button
                      onClick={() => handleFinalizeContest(nft.contestId)}
                      disabled={finalizing[nft.contestId] || !account}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      {finalizing[nft.contestId]
                        ? "Finalizing..."
                        : "Finalize Contest & Calculate Winners"}
                    </Button>
                  )}

                  {/* Claim section - show different states */}
                  {nft.contest.gamesFinalized && (
                    <>
                      {nft.contest.payoutComplete ? (
                        // All prizes distributed
                        <div className="text-center py-3 px-4 bg-muted rounded-lg">
                          <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                          <p className="text-sm text-muted-foreground">
                            All prizes distributed
                          </p>
                        </div>
                      ) : nft.claimed ? (
                        // This NFT claimed
                        <Button disabled className="w-full" variant="secondary">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Prize Claimed
                        </Button>
                      ) : nft.prizeWon > BigInt(0) ? (
                        // Eligible to claim
                        <Button
                          onClick={() =>
                            handleClaimPrize(nft.tokenId, nft.contestId)
                          }
                          className="w-full"
                          variant="default"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Claim Prize ({formatEther(nft.prizeWon)} ETH)
                        </Button>
                      ) : (
                        // Not a winner
                        <div className="text-center py-3 px-4 bg-muted rounded-lg">
                          <XCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                          <p className="text-sm text-muted-foreground">
                            No prize for this entry
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Always show leaderboard button */}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedContest(nft.contestId)}
                    className="w-full"
                  >
                    View Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {nfts
            .filter(nft => Number(nft.correctPicks) === 0)
            .map(nft => (
              <Card key={nft.tokenId}>
                {/* Same card content as above */}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Week {nft.weekNumber} - {nft.year}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        NFT #{nft.tokenId}
                      </p>
                    </div>
                    {getStatusBadge(nft)}
                  </div>
                </CardHeader>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {nfts
            .filter(nft => Number(nft.correctPicks) > 0)
            .map(nft => (
              <Card key={nft.tokenId}>
                {/* Same card content as above */}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Week {nft.weekNumber} - {nft.year}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        NFT #{nft.tokenId}
                      </p>
                    </div>
                    {getStatusBadge(nft)}
                  </div>
                </CardHeader>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* Leaderboard Modal */}
      {selectedContest && (
        <PickemLeaderboard
          contestId={selectedContest}
          onClose={() => setSelectedContest(null)}
        />
      )}
    </div>
  );
}
