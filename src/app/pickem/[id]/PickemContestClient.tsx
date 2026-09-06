"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FC, SVGProps, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getContract, toTokens } from "thirdweb";
import {
  BuyWidget,
  ConnectButton,
  darkTheme,
  lightTheme,
  useActiveAccount,
  useReadContract,
  useWalletBalance,
} from "thirdweb/react";
import { erc20Abi } from "viem";

import ContestPicksView from "@/components/pickem/ContestPicksView";
import ContestStatsCard from "@/components/pickem/ContestStatsCard";
import MyPickems from "@/components/pickem/MyPickems";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { appName, chain, usdc } from "@/constants";
import { useBalanceRefresh } from "@/hooks/useBalanceRefresh";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useHaptics } from "@/hooks/useHaptics";
import { useOwnedPickemEntries } from "@/hooks/useOwnedPickemEntries";
import { usePickemContract } from "@/hooks/usePickemContract";
import { usePickemPicks } from "@/hooks/usePickemPicks";
import { useWeekGames } from "@/hooks/useWeekGames";
import { formatKickoffTime } from "@/lib/date";
import { isValidTiebreaker } from "@/lib/pickem-entry";
import { buildPickemShareUrl } from "@/lib/pickem-share";
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

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}

function FarcasterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M18.24.24H5.76C2.5789.24 0 2.8188 0 6v12c0 3.1811 2.5789 5.76 5.76 5.76h12.48c3.1812 0 5.76-2.5789 5.76-5.76V6C24 2.8188 21.4212.24 18.24.24m.8155 17.1662v.504c.2868-.0256.5458.1905.5439.479v.5688h-5.1437v-.5688c-.0019-.2885.2576-.5047.5443-.479v-.504c0-.22.1525-.402.358-.458l-.0095-4.3645c-.1589-1.7366-1.6402-3.0979-3.4435-3.0979-1.8038 0-3.2846 1.3613-3.4435 3.0979l-.0096 4.3578c.2276.0424.5318.2083.5395.4648v.504c.2863-.0256.5457.1905.5438.479v.5688H4.3915v-.5688c-.0019-.2885.2575-.5047.5438-.479v-.504c0-.2529.2011-.4548.4536-.4724v-7.895h-.4905L4.2898 7.008l2.6405-.0005V5.0419h9.9495v1.9656h2.8219l-.6091 2.0314h-.4901v7.8949c.2519.0177.453.2195.453.4724" />
    </svg>
  );
}

interface PickemContestClientProps {
  contest: ContestData;
}

export default function PickemContestClient({
  contest,
}: PickemContestClientProps) {
  const router = useRouter();
  const account = useActiveAccount();
  const { submitPredictions, confirmEntry } = usePickemContract();
  const queryClient = useQueryClient();
  const owned = useOwnedPickemEntries();
  const [additionalEntry, setAdditionalEntry] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const submissionLock = useRef(false);
  const activeIdentity = `${account?.address}:${contest.id}`;
  const identityRef = useRef(activeIdentity);
  identityRef.current = activeIdentity;
  const hasEntry =
    confirmed ||
    Boolean(owned.data?.some(entry => entry.contestId === contest.id));
  const showEntryForm =
    (!account || (!owned.isLoading && !owned.isError)) &&
    (!hasEntry || additionalEntry);
  useEffect(() => {
    setAdditionalEntry(false);
    setConfirmed(false);
  }, [account?.address, contest.id]);
  const { selectionChanged } = useHaptics();
  const { setTokenAddress } = useDisplayToken();
  const { resolvedTheme } = useTheme();
  const { isInMiniApp } = useFarcasterContext();

  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareText, setShareText] = useState("");

  // Use the new hooks for games and picks management
  const {
    games,
    isLoading: gamesLoading,
    error: gamesError,
  } = useWeekGames({
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
    ready: draftReady,
    storageAvailable,
    pending,
    setPending,
    clearDraft,
  } = usePickemPicks(contest.id, contest.gameIds);

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: walletBalance,
    isLoading: isLoadingWalletBalance,
    isError: walletBalanceError,
    refetch: refetchWalletBalance,
  } = useWalletBalance({
    chain,
    address: account?.address,
    client,
    tokenAddress:
      contest.currency === "0x0000000000000000000000000000000000000000"
        ? undefined
        : contest.currency,
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

  const shareMessage = useMemo(() => {
    const seasonLabel = SEASON_TYPE_LABELS[contest.seasonType];
    return `I just submitted my picks for Week ${contest.weekNumber} of the ${seasonLabel} on ${appName}! Think you can beat me?`;
  }, [contest.seasonType, contest.weekNumber]);

  useEffect(() => {
    if (shareModalOpen) {
      setShareText(shareMessage);
    }
  }, [shareModalOpen, shareMessage]);

  // Built from the contest id rather than window.location so the link is free
  // of whatever params the user arrived with, and carries the entered flag that
  // switches the share card to the "I'm in" variant.
  const shareUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? buildPickemShareUrl(window.location.origin, contest.id)
        : undefined,
    [contest.id],
  );

  const handleShareModalChange = (open: boolean) => {
    setShareModalOpen(open);
    if (!open) {
      router.push("/pickem?tab=my-pickems");
    }
  };

  const handleShareToX = async () => {
    const intentUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({
      text: shareText,
      ...(shareUrl ? { url: shareUrl } : {}),
    }).toString()}`;

    try {
      setShareLoading(true);
      if (isInMiniApp) {
        await sdk.actions.openUrl(intentUrl);
      } else if (typeof window !== "undefined") {
        window.open(intentUrl, "_blank", "noopener,noreferrer");
      }
      handleShareModalChange(false);
    } catch (error) {
      console.error("Error opening X compose window:", error);
      toast.error("Failed to open X");
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareToFarcaster = async () => {
    try {
      setShareLoading(true);

      if (isInMiniApp) {
        const result = await sdk.actions.composeCast({
          text: shareText,
          embeds: shareUrl ? [shareUrl] : undefined,
        });

        if (result?.cast) {
          toast.success("Cast posted to Farcaster");
          handleShareModalChange(false);
        } else {
          toast.info("Cast sharing cancelled");
        }
      } else if (typeof window !== "undefined") {
        const composeUrl = `https://warpcast.com/~/compose?${new URLSearchParams(
          {
            text: shareText,
            ...(shareUrl ? { "embeds[]": shareUrl } : {}),
          },
        ).toString()}`;
        window.open(composeUrl, "_blank", "noopener,noreferrer");
        handleShareModalChange(false);
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
    if (!account || submissionLock.current || !draftReady) return;
    if (!pending && contest.submissionDeadline <= Date.now()) {
      setSubmitError("This contest is now closed. Your draft was not entered.");
      return;
    }
    if (!pending && (!allPicksMade || !isValidTiebreaker(tiebreakerPoints))) {
      setSubmitError("Choose every winner and add a whole-number tiebreaker.");
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    let broadcast = Boolean(pending);
    try {
      if (pending) {
        setSubmitStage("Checking entry confirmation…");
        await confirmEntry(pending);
      } else {
        const sortedGameIds = [...contest.gameIds].sort((a, b) =>
          a.localeCompare(b),
        );
        await submitPredictions({
          contestId: contest.id,
          submissionDeadline: contest.submissionDeadline,
          picks: sortedGameIds.map(id => picks[id]),
          tiebreakerPoints: Number(tiebreakerPoints),
          entryFee: contest.entryFee.toString(),
          currency: contest.currency,
          onProgress: setSubmitStage,
          onBroadcast: transaction => {
            broadcast = true;
            setPending(transaction);
          },
        });
      }
      clearDraft();
      if (identityRef.current !== activeIdentity) return;
      setConfirmed(true);
      setAdditionalEntry(false);
      // Refresh entry ownership and results after chain confirmation, not wallet approval.
      void queryClient.invalidateQueries({ queryKey: ["ownedPickemEntries"] });
      void queryClient.invalidateQueries({ queryKey: ["myCurrentWeekPicks"] });
      void queryClient.invalidateQueries({ queryKey: ["pickemContests"] });
      setShareModalOpen(true);
    } catch (error) {
      if (identityRef.current !== activeIdentity) return;
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ENTRY_REVERTED")) {
        setPending(undefined);
        setSubmitError(
          "The entry transaction failed. Your picks are saved; you can try again while entries are open.",
        );
      } else if (broadcast) {
        setSubmitError(
          "Your transaction was sent, but confirmation is still pending. Check entry status before making another entry.",
        );
      } else {
        setSubmitError(
          /reject|denied|cancel/i.test(message)
            ? "You cancelled the wallet request. Your picks are still here."
            : "Couldn’t submit your entry. Your picks are still here. Check your wallet and try again.",
        );
      }
    } finally {
      setSubmitting(false);
      submissionLock.current = false;
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

  const isSubmissionClosed = mounted && contest.submissionDeadline <= now;
  const readyToSubmit = allPicksMade && isValidTiebreaker(tiebreakerPoints);

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

  const orderedGames = [...games].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
  const lastGame = games.find(game => game.gameId === contest.tiebreakerGameId);

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
      <div className="container mx-auto max-w-6xl px-4 py-6 pb-28 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <Link href="/pickem">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All contests
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
      <div className="container mx-auto max-w-6xl px-4 py-6 pb-28 space-y-6">
        <div className="flex items-center gap-4 px-2">
          <Link href="/pickem">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All contests
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

        {account && owned.isLoading && <Skeleton className="h-40 w-full" />}
        {pending && (
          <Alert>
            <AlertDescription>
              <p className="font-semibold">Entry confirmation pending</p>
              <p>
                {submitError ||
                  "Your transaction has been sent. Check its status before making another entry."}
              </p>
              <Button
                className="mt-3"
                disabled={submitting || !account}
                onClick={handleSubmit}
              >
                {submitting ? submitStage : "Check entry status"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {account && owned.isError && (
          <Alert>
            <AlertDescription>
              We couldn’t check your existing entries.{" "}
              <Button variant="outline" onClick={() => owned.refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {hasEntry && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Your submitted picks</h2>
              {!isSubmissionClosed && !pending && (
                <Button
                  disabled={submitting}
                  variant="outline"
                  onClick={() => setAdditionalEntry(!additionalEntry)}
                >
                  {additionalEntry
                    ? "Back to my picks"
                    : "Add another paid entry"}
                </Button>
              )}
            </div>
            <MyPickems contestId={contest.id} />
          </section>
        )}
        {/* Games and Picks */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
          {/* Games List */}
          {!isSubmissionClosed && showEntryForm && !pending && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>1. Pick the winners</CardTitle>
                  <Badge variant={allPicksMade ? "default" : "secondary"}>
                    {getPickedCount()} / {contest.gameIds.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tap one team in every matchup.
                </p>
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {!draftReady
                    ? "Loading draft…"
                    : storageAvailable
                      ? `${getPickedCount() > 0 ? "Draft saved on this device" : "Start a new draft"} · Not entered yet`
                      : "Picks are only saved while this page stays open."}
                </p>
                <Progress
                  aria-label="Picks completed"
                  value={
                    contest.gameIds.length
                      ? (getPickedCount() / contest.gameIds.length) * 100
                      : 0
                  }
                />
                <Button
                  className="self-start"
                  size="sm"
                  variant="ghost"
                  disabled={
                    submitting || !draftReady || gamesLoading || !!gamesError
                  }
                  onClick={pickAtRandom}
                >
                  <Shuffle className="mr-2 size-4" />
                  Fill remaining picks randomly
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {gamesLoading && (
                  <>
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </>
                )}
                {(gamesError ||
                  (!gamesLoading &&
                    games.length !== contest.gameIds.length)) && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Some matchups couldn’t be loaded. Refresh the page to try
                      again.
                    </AlertDescription>
                  </Alert>
                )}
                {orderedGames.map((game, index) => (
                  <div key={game.gameId}>
                    {(index === 0 ||
                      new Date(
                        orderedGames[index - 1].kickoff,
                      ).toDateString() !==
                        new Date(game.kickoff).toDateString()) && (
                      <h3 className="mb-3 pt-2 text-sm font-semibold">
                        {new Date(game.kickoff).toLocaleDateString([], {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </h3>
                    )}
                    <fieldset
                      key={game.gameId}
                      className="scroll-mt-40 rounded-xl border p-3 sm:p-4"
                      disabled={submitting || !draftReady}
                      id={`game-${game.gameId}`}
                    >
                      <legend className="px-2 text-xs text-muted-foreground">
                        {formatKickoffTime(game.kickoff)}
                      </legend>
                      <div className="grid grid-cols-2 gap-3">
                        {([0, 1] as const).map(side => {
                          const home = side === 1;
                          const team = home ? game.homeTeam : game.awayTeam;
                          const logo = home ? game.homeLogo : game.awayLogo;
                          return (
                            <label
                              key={side}
                              className={`relative flex min-w-0 min-h-24 cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${picks[game.gameId] === side ? "border-primary bg-primary/10" : "hover:bg-accent/30"}`}
                            >
                              <input
                                checked={picks[game.gameId] === side}
                                className="size-4 shrink-0 accent-primary"
                                name={`winner-${game.gameId}`}
                                type="radio"
                                value={side}
                                onChange={() => {
                                  selectionChanged();
                                  setPick(game.gameId, side);
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {logo && (
                                    <img
                                      alt=""
                                      className="size-7 shrink-0 object-contain"
                                      src={logo}
                                    />
                                  )}
                                  <span
                                    className="min-w-0 truncate text-sm font-semibold"
                                    title={team}
                                  >
                                    {team}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {home ? "Home" : "Away"} ·{" "}
                                  {home ? game.homeRecord : game.awayRecord}
                                </p>
                                <p className="mt-1 text-xs font-medium">
                                  {picks[game.gameId] === side
                                    ? "Your pick"
                                    : "Select team"}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Submission Panel */}
          {!isSubmissionClosed && showEntryForm && !pending && (
            <Card
              className="scroll-mt-40 lg:sticky lg:top-24"
              id="review-picks"
            >
              <CardHeader>
                <CardTitle>2. Review &amp; enter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <details open className="rounded-lg border p-3">
                  <summary className="cursor-pointer font-semibold">
                    Your selected teams
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {orderedGames.map(game => (
                      <li key={game.gameId}>
                        <a
                          className="flex justify-between gap-2 underline underline-offset-4"
                          href={`#game-${game.gameId}`}
                        >
                          <span>
                            {game.awayAbbreviation || game.awayTeam} @{" "}
                            {game.homeAbbreviation || game.homeTeam}
                          </span>
                          <span className="font-semibold">
                            {picks[game.gameId] === 0
                              ? game.awayAbbreviation || game.awayTeam
                              : picks[game.gameId] === 1
                                ? game.homeAbbreviation || game.homeTeam
                                : "Choose a team"}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
                <p className="text-sm">
                  Entries close{" "}
                  {mounted
                    ? new Date(contest.submissionDeadline).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })
                    : "…"}
                  .
                </p>
                {/* Tiebreaker */}
                <div className="space-y-2">
                  <Label htmlFor="tiebreaker">Tiebreaker: Total Points</Label>
                  <Input
                    aria-describedby="tiebreaker-help"
                    disabled={submitting || !draftReady}
                    id="tiebreaker"
                    min="0"
                    placeholder="e.g., 45"
                    step="1"
                    type="number"
                    value={tiebreakerPoints}
                    onChange={e => setTiebreakerPoints(e.target.value)}
                  />
                  <p
                    className="text-sm text-muted-foreground"
                    id="tiebreaker-help"
                  >
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
                <p className="text-sm text-muted-foreground">
                  {getPickedCount()} of {contest.gameIds.length} winners
                  selected. You can change any pick before submitting. Each
                  submission is a new paid entry. Submitted picks cannot be
                  edited.
                </p>
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
                      {walletBalance
                        ? Number(walletBalance.displayValue).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
                {submitError && (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}
                {/* Submit Button */}
                {!account ? (
                  <ConnectButton
                    chain={chain}
                    client={client}
                    connectButton={{
                      label: "Log in to submit picks",
                      className: "!w-full",
                    }}
                  />
                ) : isLoadingWalletBalance ? (
                  <Button disabled className="w-full">
                    Checking balance…
                  </Button>
                ) : walletBalanceError ? (
                  <div className="space-y-2" role="alert">
                    <p className="text-sm">We couldn’t check your balance.</p>
                    <Button
                      variant="outline"
                      onClick={() => refetchWalletBalance()}
                    >
                      Check balance again
                    </Button>
                  </div>
                ) : hasSufficientBalance ? (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      !account ||
                      !draftReady ||
                      submitting ||
                      isSubmissionClosed ||
                      !readyToSubmit ||
                      gamesLoading ||
                      !!gamesError ||
                      games.length !== contest.gameIds.length
                    }
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? submitStage
                      : isSubmissionClosed
                        ? "Submissions Closed"
                        : !allPicksMade
                          ? "Complete All Picks"
                          : !isValidTiebreaker(tiebreakerPoints)
                            ? "Add a tiebreaker score"
                            : `Submit picks · ${formattedEntryFee}`}
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
              </CardContent>
            </Card>
          )}
        </div>

        {isSubmissionClosed && (
          <Alert>
            <Clock className="size-4" />
            <AlertDescription>
              Entries are closed. Follow the picks and results below.
            </AlertDescription>
          </Alert>
        )}
        <details
          className="rounded-xl border bg-card p-4"
          open={isSubmissionClosed}
        >
          <summary className="cursor-pointer font-semibold">
            Leaderboard &amp; submitted picks
          </summary>
          <ContestPicksView
            contestId={contest.id}
            gameIds={contest.gameIds}
            gamesFinalized={contest.gamesFinalized}
            seasonType={contest.seasonType}
            tiebreakerGameId={contest.tiebreakerGameId}
            weekNumber={contest.weekNumber}
            year={contest.year}
          />
        </details>
      </div>

      {!isSubmissionClosed && showEntryForm && !pending && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span aria-live="polite" className="text-sm font-medium">
              {getPickedCount()} / {contest.gameIds.length} picked
            </span>
            <Button asChild>
              <a
                href={
                  allPicksMade
                    ? "#review-picks"
                    : `#game-${orderedGames.find(game => picks[game.gameId] !== 0 && picks[game.gameId] !== 1)?.gameId}`
                }
              >
                {allPicksMade ? "Review & enter" : "Next unpicked game"}
              </a>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={shareModalOpen} onOpenChange={handleShareModalChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You’re in! Your picks are submitted.</DialogTitle>
            <DialogDescription>
              Your entry is confirmed. Follow your picks, scores, and standing.
            </DialogDescription>
          </DialogHeader>

          <Button
            className="w-full"
            onClick={() => handleShareModalChange(false)}
          >
            View my picks
          </Button>
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Share with friends
            </summary>
            <Textarea
              className="mt-3 min-h-24 resize-none text-sm"
              value={shareText}
              onChange={event => setShareText(event.target.value)}
            />
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex w-full gap-2">
                <Button
                  className="flex-1 bg-black text-white hover:bg-black/90"
                  disabled={shareLoading}
                  type="button"
                  onClick={handleShareToX}
                >
                  <XIcon className="mr-2 h-4 w-4" />
                  Compose Post
                </Button>
                <Button
                  className="flex-1 bg-[#8A63D2] text-white hover:bg-[#8A63D2]/90"
                  disabled={shareLoading}
                  type="button"
                  onClick={handleShareToFarcaster}
                >
                  <FarcasterIcon className="mr-2 h-4 w-4" />
                  Compose Cast
                </Button>
              </div>
            </DialogFooter>
          </details>
        </DialogContent>
      </Dialog>
    </>
  );
}
