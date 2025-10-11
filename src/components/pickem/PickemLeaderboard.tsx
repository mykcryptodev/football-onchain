"use client";

import { Award, Medal, Trophy, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { formatEther } from "viem";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemNFT } from "@/hooks/usePickemNFT";

interface LeaderboardEntry {
  tokenId: number;
  address: string;
  originalPredictor: string;
  correctPicks: number;
  totalGames: number;
  tiebreakerPoints: number;
  submissionTime: number;
  rank: number;
  prize: bigint;
}

interface PickemLeaderboardProps {
  contestId: number;
  onClose: () => void;
}

export default function PickemLeaderboard({
  contestId,
  onClose,
}: PickemLeaderboardProps) {
  const account = useActiveAccount();
  const { getContest, getContestLeaderboard, getNFTPrediction } =
    usePickemContract();
  const { getNFTOwner } = usePickemNFT();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [prizePool, setPrizePool] = useState<bigint>(BigInt(0));

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch contest data
      const contest = await getContest(contestId);
      setPrizePool(contest.totalPrizePool);

      // Fetch leaderboard entries
      const leaderboard = await getContestLeaderboard(contestId);

      // Calculate prize pool after treasury fee (2%)
      const TREASURY_FEE = 20; // 2%
      const PERCENT_DENOMINATOR = 1000;
      const treasuryFee =
        (contest.totalPrizePool * BigInt(TREASURY_FEE)) /
        BigInt(PERCENT_DENOMINATOR);
      const netPool = contest.totalPrizePool - treasuryFee;

      // Process each leaderboard entry
      const processedEntries: LeaderboardEntry[] = [];

      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const tokenId = Number(entry.tokenId);

        // Get current owner and original predictor
        const currentOwner = await getNFTOwner(tokenId);
        const predictionData = await getNFTPrediction(tokenId);
        const originalPredictor = predictionData[1]; // predictor is second element

        // Calculate prize amount based on position
        let prizeAmount = BigInt(0);
        if (
          contest.payoutStructure.payoutPercentages &&
          i < contest.payoutStructure.payoutPercentages.length
        ) {
          const percentage = contest.payoutStructure.payoutPercentages[i];
          prizeAmount = (netPool * percentage) / BigInt(PERCENT_DENOMINATOR);
        }

        processedEntries.push({
          tokenId,
          address: currentOwner,
          originalPredictor,
          correctPicks: Number(entry.score),
          totalGames: contest.gameIds.length,
          tiebreakerPoints: Number(entry.tiebreakerPoints),
          submissionTime: Number(entry.submissionTime) * 1000,
          rank: i + 1,
          prize: prizeAmount,
        });
      }

      setEntries(processedEntries);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1st Place</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400">2nd Place</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600">3rd Place</Badge>;
    return null;
  };

  const formatAddress = (address: string) => {
    if (address === account?.address) return "You";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Contest #{contestId} Leaderboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prize Pool Info */}
          <Card className="p-4 bg-accent/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Prize Pool
                </p>
                <p className="text-2xl font-bold">
                  {formatEther(prizePool)} ETH
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </div>
          </Card>

          {/* Leaderboard */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">Loading leaderboard...</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">No entries yet</div>
            ) : (
              entries.map(entry => (
                <Card
                  key={entry.tokenId}
                  className={`p-4 ${entry.address === account?.address ? "border-primary" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {formatAddress(entry.address)}
                          </p>
                          {entry.address === account?.address && (
                            <Badge className="text-xs" variant="secondary">
                              You
                            </Badge>
                          )}
                          {getRankBadge(entry.rank)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>NFT #{entry.tokenId}</p>
                          {entry.address.toLowerCase() !==
                            entry.originalPredictor.toLowerCase() && (
                            <p className="text-xs text-orange-500 dark:text-orange-400">
                              Transferred from{" "}
                              {entry.originalPredictor.slice(0, 6)}...
                              {entry.originalPredictor.slice(-4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <p className="font-bold text-lg">
                        {entry.correctPicks}/{entry.totalGames}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(
                          (entry.correctPicks / entry.totalGames) *
                          100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>

                    {/* Tiebreaker */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Tiebreaker
                      </p>
                      <p className="font-medium">
                        {entry.tiebreakerPoints} pts
                      </p>
                    </div>

                    {/* Prize */}
                    {entry.prize > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Prize</p>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {formatEther(entry.prize)} ETH
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Payout Structure */}
          <Card className="p-4 bg-accent/30">
            <p className="text-sm font-medium mb-2">Payout Structure</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>1st Place</span>
                <span className="font-medium">70% of pool</span>
              </div>
              <div className="flex justify-between">
                <span>2nd Place</span>
                <span className="font-medium">20% of pool</span>
              </div>
              <div className="flex justify-between">
                <span>3rd Place</span>
                <span className="font-medium">10% of pool</span>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
