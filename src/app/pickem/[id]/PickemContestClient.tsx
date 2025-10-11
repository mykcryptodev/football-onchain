"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";
import { formatEther } from "viem";

import ContestPicksView from "@/components/pickem/ContestPicksView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePickemContract } from "@/hooks/usePickemContract";

interface ContestData {
  id: number;
  creator: string;
  seasonType: number;
  weekNumber: number;
  year: number;
  entryFee: bigint;
  currency: string;
  totalPrizePool: bigint;
  totalEntries: number;
  submissionDeadline: number;
  gamesFinalized: boolean;
  payoutType: number;
  gameIds: string[];
}

interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string;
  homeLogo?: string;
  awayLogo?: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
}

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

const PAYOUT_TYPE_LABELS: Record<number, string> = {
  0: "Winner Take All",
  1: "Top 3",
  2: "Top 5",
};

interface PickemContestClientProps {
  contest: ContestData;
}

export default function PickemContestClient({
  contest,
}: PickemContestClientProps) {
  const router = useRouter();
  const account = useActiveAccount();
  const { submitPredictions } = usePickemContract();

  const [games, setGames] = useState<GameInfo[]>([]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [tiebreakerPoints, setTiebreakerPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGameInfo = useCallback(
    async (gameIds: string[]) => {
      try {
        // Use the week-games API instead of contest-games API
        const response = await fetch(
          `/api/week-games?year=${contest.year}&seasonType=${contest.seasonType}&week=${contest.weekNumber}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch games: ${response.statusText}`);
        }

        const allWeekGames: GameInfo[] = await response.json();

        // Filter to only the games in this contest
        const games: GameInfo[] = allWeekGames.filter(weekGame =>
          gameIds.some(contestGameId => contestGameId === weekGame.gameId),
        );

        setGames(
          games.sort(
            (a, b) =>
              new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
          ),
        );
      } catch (error) {
        console.error("Error fetching game info:", error);
        toast.error("Failed to load game information");
      }
    },
    [contest.year, contest.seasonType, contest.weekNumber],
  );

  useEffect(() => {
    // Initialize picks
    const initialPicks: Record<string, number> = {};
    contest.gameIds.forEach(id => {
      initialPicks[id] = -1; // -1 means no pick yet
    });
    setPicks(initialPicks);

    // Fetch game info (mock for now)
    fetchGameInfo(contest.gameIds);
  }, [contest, fetchGameInfo]);

  const handleSubmit = async () => {
    if (!contest || !account) return;

    // Validate all picks are made
    const allPicked = Object.values(picks).every(pick => pick !== -1);
    if (!allPicked) {
      toast.error("Please make a pick for every game");
      return;
    }

    if (!tiebreakerPoints || Number(tiebreakerPoints) < 0) {
      toast.error("Please enter a valid tiebreaker score");
      return;
    }

    setSubmitting(true);
    try {
      // Convert picks to array format expected by contract
      const picksArray = contest.gameIds.map(id => picks[id]);

      await submitPredictions({
        contestId: contest.id,
        picks: picksArray,
        tiebreakerPoints: Number(tiebreakerPoints),
        entryFee: formatEther(contest.entryFee),
        currency:
          contest.currency === "ETH"
            ? "0x0000000000000000000000000000000000000000"
            : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC address
      });

      toast.success("Your picks have been submitted!");
      router.push("/pickem");
    } catch (error) {
      console.error("Error submitting picks:", error);
      toast.error("Failed to submit picks");
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = (deadline: number) => {
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) return "Closed";

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h remaining`;
  };

  const getPickedCount = () => {
    return Object.values(picks).filter(pick => pick !== -1).length;
  };

  const isSubmissionClosed = contest.submissionDeadline <= Date.now();

  return (
    <div className="container mx-auto py-5 space-y-6">
      <div className="flex items-center gap-4 px-2">
        <Link href="/pickem">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Badge
          className="ml-auto"
          variant={isSubmissionClosed ? "secondary" : "default"}
        >
          <Clock className="h-3 w-3 mr-1" />
          {getTimeRemaining(contest.submissionDeadline)}
        </Badge>
      </div>
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <div>
          <h1 className="text-3xl font-bold">
            {SEASON_TYPE_LABELS[contest.seasonType]} Week {contest.weekNumber}
          </h1>
          <p className="text-muted-foreground">
            {contest.year} Season • Contest #{contest.id}
          </p>
        </div>
      </div>

      {/* Contest Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contest Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Entry Fee</p>
              <p className="font-medium">
                {contest.currency === "ETH"
                  ? `${formatEther(contest.entryFee)} ETH`
                  : `${Number(contest.entryFee) / 1e6} USDC`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
              <p className="font-medium">
                {contest.currency === "ETH"
                  ? `${formatEther(contest.totalPrizePool)} ETH`
                  : `${Number(contest.totalPrizePool) / 1e6} USDC`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Entries</p>
              <p className="font-medium">{contest.totalEntries}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Payout</p>
              <p className="font-medium">
                {PAYOUT_TYPE_LABELS[contest.payoutType]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games and Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Games List */}
        {!isSubmissionClosed && (
          <Card>
            <CardHeader>
              <CardTitle>Games ({games.length})</CardTitle>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Picks Made: {getPickedCount()} / {games.length}
                </span>
                <Badge
                  variant={
                    getPickedCount() === games.length ? "default" : "secondary"
                  }
                >
                  {getPickedCount() === games.length
                    ? "Ready to Submit"
                    : "Incomplete"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {games.map((game, index) => (
                <div key={game.gameId} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                    <span>Game {index + 1}</span>
                    <span>
                      {(() => {
                        const kickoffDate = new Date(game.kickoff);
                        return `${kickoffDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ${kickoffDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
                      })()}
                    </span>
                  </div>

                  <RadioGroup
                    value={picks[game.gameId]?.toString()}
                    onValueChange={(value: string) =>
                      setPicks({ ...picks, [game.gameId]: parseInt(value) })
                    }
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${
                          picks[game.gameId] === 0
                            ? "border-primary bg-primary/10"
                            : ""
                        }`}
                        onClick={() => setPicks({ ...picks, [game.gameId]: 0 })}
                      >
                        <RadioGroupItem id={`${game.gameId}-away`} value="0" />
                        <Label
                          className="flex-1 cursor-pointer"
                          htmlFor={`${game.gameId}-away`}
                        >
                          <div className="flex items-center gap-2 justify-between w-full">
                            <img
                              alt={`${game.awayTeam} logo`}
                              className="h-6 w-6 flex-shrink-0"
                              src={game.awayLogo}
                            />
                            <span className="font-medium sm:hidden block">
                              {game.awayAbbreviation}
                            </span>
                            <span className="font-medium hidden sm:block">
                              {game.awayTeam}
                            </span>
                            <span className="text-sm text-muted-foreground text-nowrap">
                              {game.awayRecord}
                            </span>
                          </div>
                        </Label>
                      </div>

                      <div
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${
                          picks[game.gameId] === 1
                            ? "border-primary bg-primary/10"
                            : ""
                        }`}
                        onClick={() => setPicks({ ...picks, [game.gameId]: 1 })}
                      >
                        <RadioGroupItem id={`${game.gameId}-home`} value="1" />
                        <Label
                          className="flex-1 cursor-pointer"
                          htmlFor={`${game.gameId}-home`}
                        >
                          <div className="flex items-center gap-2 justify-between w-full">
                            <img
                              alt={`${game.homeTeam} logo`}
                              className="h-6 w-6 flex-shrink-0"
                              src={game.homeLogo}
                            />
                            <span className="font-medium sm:hidden block">
                              {game.homeAbbreviation}
                            </span>
                            <span className="font-medium hidden sm:block">
                              {game.homeTeam}
                            </span>
                            <span className="text-sm text-muted-foreground text-nowrap">
                              {game.homeRecord}
                            </span>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submission Panel */}
        {!isSubmissionClosed && (
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Picks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tiebreaker */}
              <div className="space-y-2">
                <Label htmlFor="tiebreaker">Tiebreaker: Total Points</Label>
                <Input
                  id="tiebreaker"
                  min="0"
                  placeholder="e.g., 45"
                  type="number"
                  value={tiebreakerPoints}
                  onChange={e => setTiebreakerPoints(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Guess the total points scored in the highest-scoring game
                </p>
              </div>

              {/* Entry Fee Display */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Entry Fee:</span>
                  <span className="font-bold">
                    {contest.currency === "ETH"
                      ? `${formatEther(contest.entryFee)} ETH`
                      : `${Number(contest.entryFee) / 1e6} USDC`}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                size="lg"
                disabled={
                  !account ||
                  submitting ||
                  isSubmissionClosed ||
                  getPickedCount() !== games.length
                }
                onClick={handleSubmit}
              >
                {submitting
                  ? "Submitting..."
                  : isSubmissionClosed
                    ? "Submissions Closed"
                    : getPickedCount() !== games.length
                      ? "Complete All Picks"
                      : "Submit Picks"}
              </Button>

              {!account && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please connect your wallet to submit picks.
                  </AlertDescription>
                </Alert>
              )}

              {isSubmissionClosed && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The submission deadline has passed. You can no longer submit
                    picks for this contest.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Participants' Picks */}
      <ContestPicksView
        contestId={contest.id}
        gameIds={contest.gameIds}
        gamesFinalized={contest.gamesFinalized}
        seasonType={contest.seasonType}
        weekNumber={contest.weekNumber}
        year={contest.year}
      />
    </div>
  );
}
