"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Shuffle,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getContract, toTokens } from "thirdweb";
import {
  BuyWidget,
  darkTheme,
  lightTheme,
  useActiveAccount,
  useReadContract,
  useWalletBalance,
} from "thirdweb/react";
import { erc20Abi } from "viem";

import ContestPicksView from "@/components/pickem/ContestPicksView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { chain } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useHaptics } from "@/hooks/useHaptics";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";
import { usePickemContract } from "@/hooks/usePickemContract";
import { toCaip19 } from "@/lib/utils";
import { useDisplayToken } from "@/providers/DisplayTokenProvider";
import { client } from "@/providers/Thirdweb";

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
  homeScore?: number;
  awayScore?: number;
  status?: string;
  odds?: {
    details?: string;
    overUnder?: number;
    spread?: number;
    homeTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
    awayTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
  };
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
  const { selectionChanged } = useHaptics();
  const { setTokenAddress } = useDisplayToken();
  const { resolvedTheme } = useTheme();
  const { isInMiniApp } = useIsInMiniApp();

  const [games, setGames] = useState<GameInfo[]>([]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [tiebreakerPoints, setTiebreakerPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: walletBalance } = useWalletBalance({
    chain,
    address: account?.address,
    client,
    tokenAddress: contest.currency,
  });

  // Set the display token to the contest's currency
  useEffect(() => {
    setTokenAddress(contest.currency);
    return () => setTokenAddress(null); // Reset when leaving the page
  }, [contest.currency, setTokenAddress]);

  // Format currency values using the hook
  const { formattedValue: formattedEntryFee } = useFormattedCurrency({
    amount: contest.entryFee,
    currencyAddress: contest.currency,
  });

  const { formattedValue: formattedPrizePool } = useFormattedCurrency({
    amount: contest.totalPrizePool,
    currencyAddress: contest.currency,
  });

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

  // Pre-select winners for finished games
  useEffect(() => {
    if (games.length === 0) return;

    setPicks(currentPicks => {
      const updatedPicks: Record<string, number> = { ...currentPicks };
      let hasChanges = false;

      games.forEach(game => {
        // Check if game is finished
        if (
          game.status === "STATUS_FINAL" &&
          game.homeScore !== undefined &&
          game.awayScore !== undefined
        ) {
          // Determine winner (1 = home, 0 = away)
          const winner = game.homeScore > game.awayScore ? 1 : 0;

          // Only update if not already set
          if (updatedPicks[game.gameId] === -1) {
            updatedPicks[game.gameId] = winner;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updatedPicks : currentPicks;
    });
  }, [games]);

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

      // Don't format the entry fee - pass the raw bigint value as string
      // submitPredictions will handle the decimal conversion internally
      await submitPredictions({
        contestId: contest.id,
        picks: picksArray,
        tiebreakerPoints: Number(tiebreakerPoints),
        entryFee: contest.entryFee.toString(),
        currency: contest.currency,
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
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h remaining`;
    return `${minutes}m remaining`;
  };

  const getPickedCount = () => {
    return Object.values(picks).filter(pick => pick !== -1).length;
  };

  const pickAtRandom = () => {
    const randomPicks: Record<string, number> = {};
    contest.gameIds.forEach(id => {
      randomPicks[id] = Math.random() < 0.5 ? 0 : 1;
    });
    setPicks(randomPicks);

    // Also generate a random tiebreaker between 20-70 points
    const randomTiebreaker = Math.floor(Math.random() * 51) + 20; // 20-70
    setTiebreakerPoints(randomTiebreaker.toString());

    toast.success("Random picks generated!");
  };

  const formatMoneyLine = (moneyLine: number | undefined) => {
    if (!moneyLine) return "";
    return moneyLine > 0 ? `+${moneyLine}` : `${moneyLine}`;
  };

  const isGameFinished = (game: GameInfo) => {
    return (
      game.status === "STATUS_FINAL" &&
      game.homeScore !== undefined &&
      game.awayScore !== undefined
    );
  };

  const getWinner = (game: GameInfo): "home" | "away" | null => {
    if (!isGameFinished(game)) return null;
    if (game.homeScore! > game.awayScore!) return "home";
    if (game.awayScore! > game.homeScore!) return "away";
    return null; // tie (unlikely in NFL)
  };

  const isSubmissionClosed = contest.submissionDeadline <= Date.now();

  const lastGame = useMemo(() => {
    // get the game with the latest start time
    return [...games].sort(
      (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
    )[0];
  }, [games]);

  const { data: currencyDecimals } = useReadContract({
    contract: getContract({
      client,
      chain,
      address: contest.currency as `0x${string}`,
      abi: erc20Abi,
    }),
    method: "decimals",
    params: [],
  });

  const hasSufficientBalance = useMemo(() => {
    return walletBalance && walletBalance.value >= contest.entryFee;
  }, [walletBalance, contest.entryFee]);

  const handleMiniAppSwap = async () => {
    if (isInMiniApp) {
      await sdk.actions.swapToken({
        buyToken: toCaip19({ address: contest.currency, chain }),
        sellAmount: toTokens(
          contest.entryFee,
          currencyDecimals ?? 18,
        ).toString(),
      });
    } else {
      toast.error("You must be in a Farcaster Mini App to swap");
    }
  };

  if (!resolvedTheme) return null;

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
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Entry Fee</p>
              <p className="font-medium">{formattedEntryFee}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
              <p className="font-medium">{formattedPrizePool}</p>
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
              <div className="flex justify-between items-center">
                <CardTitle>Games ({games.length})</CardTitle>
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Picks Made: {getPickedCount()} / {games.length}
                </span>
                <Button
                  disabled={submitting || isSubmissionClosed}
                  size="sm"
                  variant="outline"
                  onClick={pickAtRandom}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Pick Em Randomly
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {games.map((game, index) => {
                const gameFinished = isGameFinished(game);
                const winner = getWinner(game);

                return (
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
                          className={`flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${
                            picks[game.gameId] === 0
                              ? "border-primary bg-primary/10"
                              : ""
                          }`}
                          onClick={() => {
                            selectionChanged();
                            setPicks({ ...picks, [game.gameId]: 0 });
                          }}
                        >
                          <RadioGroupItem
                            className="mt-1"
                            id={`${game.gameId}-away`}
                            value="0"
                          />
                          <Label
                            className="flex-1 cursor-pointer"
                            htmlFor={`${game.gameId}-away`}
                          >
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex items-center gap-2 justify-between w-full">
                                <div className="flex items-center gap-2 justify-between w-fit">
                                  <img
                                    alt={`${game.awayTeam} logo`}
                                    className="h-6 w-6 flex-shrink-0"
                                    src={game.awayLogo}
                                  />
                                  <div
                                    className={`font-medium sm:hidden block ${winner === "away" ? "text-primary font-bold" : ""}`}
                                  >
                                    {game.awayAbbreviation}
                                  </div>
                                  <div
                                    className={`font-medium hidden sm:block ${winner === "away" ? "text-primary font-bold" : ""}`}
                                  >
                                    {game.awayTeam}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground text-nowrap">
                                  {game.awayRecord}
                                </div>
                              </div>
                              {gameFinished && winner === "away" && (
                                <div className="flex items-center gap-2 text-xs justify-end">
                                  <Badge className="opacity-50 text-[10px] bg-green-100 text-green-700 px-1.5 py-0 h-4">
                                    W
                                  </Badge>
                                </div>
                              )}
                              {!gameFinished &&
                                game.odds?.awayTeamOdds &&
                                game.odds.awayTeamOdds.moneyLine && (
                                  <div className="flex items-center gap-2 text-xs justify-end">
                                    <Badge
                                      className={`opacity-50 text-[10px] px-1.5 py-0 h-4 ${
                                        game.odds.awayTeamOdds.favorite
                                          ? "bg-green-100 hover:bg-green-200 text-green-700"
                                          : "bg-red-100 hover:bg-red-200 text-red-700"
                                      }`}
                                    >
                                      {formatMoneyLine(
                                        game.odds.awayTeamOdds.moneyLine,
                                      )}
                                    </Badge>
                                  </div>
                                )}
                            </div>
                          </Label>
                        </div>

                        <div
                          className={`flex items-start space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 ${
                            picks[game.gameId] === 1
                              ? "border-primary bg-primary/10"
                              : ""
                          }`}
                          onClick={() => {
                            selectionChanged();
                            setPicks({ ...picks, [game.gameId]: 1 });
                          }}
                        >
                          <RadioGroupItem
                            className="mt-1"
                            id={`${game.gameId}-home`}
                            value="1"
                          />
                          <Label
                            className="flex-1 cursor-pointer"
                            htmlFor={`${game.gameId}-home`}
                          >
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex items-center gap-2 justify-between w-full">
                                <div className="flex items-center gap-2 justify-between w-fit">
                                  <img
                                    alt={`${game.homeTeam} logo`}
                                    className="h-6 w-6 flex-shrink-0"
                                    src={game.homeLogo}
                                  />
                                  <div
                                    className={`font-medium sm:hidden block ${winner === "home" ? "text-primary font-bold" : ""}`}
                                  >
                                    {game.homeAbbreviation}
                                  </div>
                                  <div
                                    className={`font-medium hidden sm:block ${winner === "home" ? "text-primary font-bold" : ""}`}
                                  >
                                    {game.homeTeam}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground text-nowrap">
                                  {game.homeRecord}
                                </div>
                              </div>
                              {gameFinished && winner === "home" && (
                                <div className="flex items-center gap-2 text-xs justify-end">
                                  <Badge className="opacity-50 text-[10px] bg-green-100 text-green-700 px-1.5 py-0 h-4">
                                    Won {game.homeScore} - {game.awayScore}
                                  </Badge>
                                </div>
                              )}
                              {!gameFinished &&
                                game.odds?.homeTeamOdds &&
                                game.odds.homeTeamOdds.moneyLine && (
                                  <div className="flex items-end gap-2 text-xs justify-end">
                                    <Badge
                                      className={`opacity-50 text-[10px] px-1.5 py-0 h-4 ${
                                        game.odds.homeTeamOdds.favorite
                                          ? "bg-green-100 hover:bg-green-200 text-green-700"
                                          : "bg-red-100 hover:bg-red-200 text-red-700"
                                      }`}
                                    >
                                      {formatMoneyLine(
                                        game.odds.homeTeamOdds.moneyLine,
                                      )}
                                    </Badge>
                                  </div>
                                )}
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                );
              })}
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
                  Guess the total points scored in the{" "}
                  {lastGame?.awayAbbreviation} @ {lastGame?.homeAbbreviation}{" "}
                  game
                  {lastGame?.odds?.overUnder && (
                    <span className="font-medium text-muted-foreground">
                      {" "}
                      (over/under: {lastGame.odds.overUnder})
                    </span>
                  )}
                </p>
              </div>
              {/* Entry Fee Display */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Entry Fee:</span>
                  <span className="font-bold">{formattedEntryFee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">
                    Your Balance:
                  </span>
                  <span className="text-muted-foreground text-xs font-bold">
                    {Number(walletBalance?.displayValue).toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Submit Button */}
              {hasSufficientBalance ? (
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
              ) : (
                <div className="flex flex-col items-center">
                  {/* if the user is in a mini app, show the buy widget */}
                  {isInMiniApp ? (
                    <div className="flex flex-col gap-2 items-center w-full">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleMiniAppSwap}
                      >
                        Swap for ${formattedEntryFee}
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        You do not have enough balance to submit picks.
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 items-center w-full">
                      <div className="text-xs text-muted-foreground">
                        You do not have enough balance to submit picks.
                      </div>
                      <BuyWidget
                        chain={chain}
                        client={client}
                        showThirdwebBranding={false}
                        tokenAddress={contest.currency as `0x${string}`}
                        amount={toTokens(
                          contest.entryFee,
                          currencyDecimals ?? 18,
                        ).toString()}
                        style={{
                          border: "none",
                        }}
                        theme={
                          resolvedTheme === "dark"
                            ? darkTheme({
                                colors: { modalBg: "--var(--card-foreground)" },
                              })
                            : lightTheme({
                                colors: { modalBg: "var(--card-foreground)" },
                              })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

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
