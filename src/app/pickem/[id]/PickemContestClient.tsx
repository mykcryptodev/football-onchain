"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { AlertCircle, ArrowLeft, Clock, Share2, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FC, useEffect, useMemo, useState } from "react";
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
import ContestStatsCard from "@/components/pickem/ContestStatsCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { appName, chain, usdc } from "@/constants";
import { useBalanceRefresh } from "@/hooks/useBalanceRefresh";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useHaptics } from "@/hooks/useHaptics";
import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemPicks } from "@/hooks/usePickemPicks";
import { useWeekGames } from "@/hooks/useWeekGames";
import { formatKickoffTime } from "@/lib/date";
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
  tiebreakerGameId: string;
  entryFeeUsd?: number;
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
  const { isInMiniApp } = useFarcasterContext();

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Use the new hooks for games and picks management
  const { games } = useWeekGames({
    year: contest.year,
    seasonType: contest.seasonType,
    weekNumber: contest.weekNumber,
    gameIds: contest.gameIds,
  });

  const {
    picks,
    setPick,
    pickAtRandom,
    tiebreakerPoints,
    setTiebreakerPoints,
    getPickedCount,
    allPicksMade,
  } = usePickemPicks(contest.gameIds);

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: walletBalance,
    isLoading: isLoadingWalletBalance,
    refetch: refetchWalletBalance,
  } = useWalletBalance({
    chain,
    address: account?.address,
    client,
    tokenAddress: contest.currency,
  });

  const { start: startBalanceRefresh } = useBalanceRefresh({
    refetch: refetchWalletBalance,
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

  // Pre-select winners for finished games
  useEffect(() => {
    if (games.length === 0) return;

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
        if (picks[game.gameId] === -1) {
          setPick(game.gameId, winner);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  const shareMessage = useMemo(() => {
    const seasonLabel = SEASON_TYPE_LABELS[contest.seasonType];
    return `I just submitted my picks for Week ${contest.weekNumber} of the ${seasonLabel} on ${appName}! Think you can beat me?`;
  }, [contest.seasonType, contest.weekNumber]);

  const handleShareModalChange = (open: boolean) => {
    setShareModalOpen(open);
    if (!open) {
      router.push("/pickem");
    }
  };

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : undefined;
    const shareText = shareUrl ? `${shareMessage}\n${shareUrl}` : shareMessage;

    try {
      setShareLoading(true);

      if (isInMiniApp) {
        const result = await sdk.actions.composeCast({
          text: shareMessage,
          embeds: shareUrl ? [shareUrl] : undefined,
        });

        if (result?.cast) {
          toast.success("Cast posted to Farcaster");
          handleShareModalChange(false);
        } else {
          toast.info("Cast sharing cancelled");
        }
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${appName} Pick'em`,
          text: shareMessage,
          url: shareUrl,
        });
        toast.success("Thanks for sharing your picks!");
        handleShareModalChange(false);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        toast.success("Share message copied to clipboard");
        handleShareModalChange(false);
      } else {
        toast.error("Sharing is not supported on this device");
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        toast.info("Share cancelled");
      } else {
        console.error("Error sharing picks:", error);
        toast.error("Failed to share your picks");
      }
    } finally {
      setShareLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!contest || !account) return;

    // Validate all picks are made
    if (!allPicksMade) {
      toast.error("Please make a pick for every game");
      return;
    }

    if (!tiebreakerPoints || Number(tiebreakerPoints) < 0) {
      toast.error("Please enter a valid tiebreaker score");
      return;
    }

    setSubmitting(true);
    try {
      // Sort gameIds to match oracle's sorted order before mapping picks
      const sortedGameIds = [...contest.gameIds].sort((a, b) =>
        a.localeCompare(b),
      );
      // Convert picks to array format expected by contract
      const picksArray = sortedGameIds.map(id => picks[id]);

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
      setShareModalOpen(true);
    } catch (error) {
      console.error("Error submitting picks:", error);
      toast.error("Failed to submit picks");
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = (deadline: number) => {
    // Return placeholder during SSR to prevent hydration mismatch
    if (!mounted) return "Loading...";

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

  // Use mounted state to prevent hydration mismatch with Date.now()
  const isSubmissionClosed =
    mounted && contest.submissionDeadline <= Date.now();

  const EntryFeeUsd: FC<{ className?: string }> = ({ className }) => {
    return contest.entryFeeUsd ? (
      <span className={className}>
        $
        {contest.entryFeeUsd.toLocaleString([], {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ) : (
      <></>
    );
  };

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
    return (
      walletBalance &&
      walletBalance.value >= contest.entryFee &&
      !isLoadingWalletBalance
    );
  }, [walletBalance, contest.entryFee, isLoadingWalletBalance]);

  const handleMiniAppSwap = async () => {
    if (isInMiniApp) {
      startBalanceRefresh();
      await sdk.actions.swapToken({
        sellToken: toCaip19({ address: usdc[chain.id], chain }),
        buyToken: toCaip19({ address: contest.currency, chain }),
        sellAmount: contest.entryFeeUsd
          ? contest.entryFeeUsd.toString()
          : undefined,
      });
    } else {
      toast.error("You must be in a Farcaster Mini App to swap");
    }
  };

  // Show loading skeleton until mounted to prevent hydration mismatch
  if (!mounted || !resolvedTheme) {
    return (
      <div className="container mx-auto py-5 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <Link href="/pickem">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Badge className="ml-auto" variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Loading...
          </Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Contest...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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
        <ContestStatsCard
          showTitle
          currency={contest.currency}
          entryFee={contest.entryFee}
          entryFeeUsd={contest.entryFeeUsd}
          payoutType={PAYOUT_TYPE_LABELS[contest.payoutType]}
          totalEntries={contest.totalEntries}
          totalPrizePool={contest.totalPrizePool}
        />

        {/* Games and Picks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Games List */}
          {!isSubmissionClosed && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Games ({games.length})</CardTitle>
                  <Badge variant={allPicksMade ? "default" : "secondary"}>
                    {allPicksMade ? "Ready to Submit" : "Incomplete"}
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
                          {mounted
                            ? formatKickoffTime(game.kickoff)
                            : "Loading..."}
                        </span>
                      </div>

                      <RadioGroup
                        value={picks[game.gameId]?.toString()}
                        onValueChange={(value: string) =>
                          setPick(game.gameId, parseInt(value))
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
                              setPick(game.gameId, 0);
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
                              setPick(game.gameId, 1);
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
                      !allPicksMade
                    }
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? "Submitting..."
                      : isSubmissionClosed
                        ? "Submissions Closed"
                        : !allPicksMade
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
                          <div className="flex gap-2 items-center">
                            <span>Swap for {formattedEntryFee}</span>
                            <span>
                              (<EntryFeeUsd />)
                            </span>
                          </div>
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
                                  colors: {
                                    modalBg: "--var(--card-foreground)",
                                  },
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
                      The submission deadline has passed. You can no longer
                      submit picks for this contest.
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
          tiebreakerGameId={contest.tiebreakerGameId}
          weekNumber={contest.weekNumber}
          year={contest.year}
        />
      </div>

      <Dialog open={shareModalOpen} onOpenChange={handleShareModalChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your picks</DialogTitle>
            <DialogDescription>
              Let your friends know you&apos;re in. Challenge them to join the
              contest and see who comes out on top.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              {shareMessage}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleShareModalChange(false)}
            >
              Skip for now
            </Button>
            <Button disabled={shareLoading} type="button" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              {shareLoading ? "Sharing..." : "Compose cast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
