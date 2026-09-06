"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CircleDot, Minus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

import PickemLeaderboard from "@/components/pickem/PickemLeaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import {
  type CurrentWeekGamePick,
  type CurrentWeekPickemEntry,
} from "@/hooks/useMyCurrentWeekPicks";
import { useNow } from "@/hooks/useNow";
import { usePickemContract } from "@/hooks/usePickemContract";
import { formatKickoffTime } from "@/lib/date";
import {
  isGameComplete,
  isGameInProgress,
  SEASON_TYPE_LABELS,
} from "@/lib/pickem-scoring";
import { cn } from "@/lib/utils";

function resultStyles(result: CurrentWeekGamePick["result"]) {
  switch (result) {
    case "correct":
      return "border-green-500/30 bg-green-500/10";
    case "wrong":
      return "border-red-500/30 bg-red-500/10";
    case "live-winning":
      return "border-green-500/25 bg-green-500/8";
    case "live-losing":
      return "border-red-500/25 bg-red-500/8";
    default:
      return "bg-background";
  }
}

function ResultIcon({ result }: { result: CurrentWeekGamePick["result"] }) {
  if (result === "correct") {
    return <Check className="size-4 text-green-600 dark:text-green-400" />;
  }
  if (result === "wrong") {
    return <X className="size-4 text-red-600 dark:text-red-400" />;
  }
  if (result === "live-winning" || result === "live-losing") {
    return <CircleDot className="size-4 text-primary" />;
  }
  return <Minus className="size-4 text-muted-foreground" />;
}

function resultLabel(result: CurrentWeekGamePick["result"]) {
  switch (result) {
    case "correct":
      return "Correct";
    case "wrong":
      return "Wrong";
    case "live-winning":
      return "Winning";
    case "live-losing":
      return "Losing";
    default:
      return "Not started";
  }
}

function gameStatusLabel(game: CurrentWeekGamePick) {
  const status = game.status?.toLowerCase() ?? "";
  if (
    game.result === "correct" ||
    game.result === "wrong" ||
    status.includes("final") ||
    game.completed
  ) {
    return "Final";
  }
  if (isGameInProgress(game.status, game.homeScore, game.awayScore)) {
    return "Live";
  }
  return game.kickoff
    ? formatKickoffTime(game.kickoff, {
        dateOptions: { weekday: "short", month: "short", day: "numeric" },
        timeOptions: { hour: "numeric", minute: "2-digit" },
      })
    : "Schedule unavailable";
}

function TeamMark({
  name,
  abbreviation,
  logo,
  picked,
}: {
  name: string;
  abbreviation?: string;
  logo?: string;
  picked: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        picked ? "font-semibold" : "opacity-35 grayscale",
      )}
    >
      {logo ? (
        // ESPN team marks are remote SVGs/PNGs without next/image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="size-7 shrink-0" src={logo} />
      ) : null}
      <span className="truncate">{abbreviation || name}</span>
    </div>
  );
}

function GamePickRow({ game }: { game: CurrentWeekGamePick }) {
  const pickedAway = game.pick === 0;
  const pickedHome = game.pick === 1;
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined;
  const showScore =
    hasScore &&
    (game.result === "correct" ||
      game.result === "wrong" ||
      game.result === "live-winning" ||
      game.result === "live-losing" ||
      isGameInProgress(game.status, game.homeScore, game.awayScore));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-3 sm:px-4",
        resultStyles(game.result),
      )}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-background/80">
        <ResultIcon result={game.result} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>
            {game.result === "pending" &&
            isGameInProgress(game.status, game.homeScore, game.awayScore)
              ? "Tied live"
              : resultLabel(game.result)}
          </span>
          <span>{gameStatusLabel(game)}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <TeamMark
            abbreviation={game.awayAbbreviation}
            logo={game.awayLogo}
            name={game.awayTeam}
            picked={pickedAway}
          />
          <span className="text-[10px] text-muted-foreground">@</span>
          <TeamMark
            abbreviation={game.homeAbbreviation}
            logo={game.homeLogo}
            name={game.homeTeam}
            picked={pickedHome}
          />
        </div>
      </div>
      {showScore ? (
        <div className="shrink-0 text-right font-mono text-sm tabular-nums">
          <p className={pickedAway ? "font-bold" : "text-muted-foreground"}>
            {game.awayScore}
          </p>
          <p className={pickedHome ? "font-bold" : "text-muted-foreground"}>
            {game.homeScore}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PickemEntryCard({ entry }: { entry: CurrentWeekPickemEntry }) {
  const { claimPrize, getNFTOwner } = usePickemContract();
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const now = useNow();
  const [claiming, setClaiming] = useState(false);
  const [standings, setStandings] = useState(false);
  const {
    formattedValue,
    isLoading: currencyLoading,
    error: currencyError,
  } = useFormattedCurrency({
    amount: entry.prizeWon,
    currencyAddress: entry.currency,
  });
  const finished = entry.games.filter(game =>
    isGameComplete(game.status, game.completed),
  ).length;
  const finalCorrect = entry.games.filter(
    game => game.result === "correct",
  ).length;
  const canClaim =
    entry.gamesFinalized &&
    entry.prizeWon > 0n &&
    !entry.claimed &&
    !entry.payoutComplete &&
    now >= entry.payoutDeadline;
  const claim = async () => {
    setClaiming(true);
    try {
      if (
        !account ||
        (await getNFTOwner(entry.tokenId)).toLowerCase() !==
          account.address.toLowerCase()
      )
        throw new Error(
          "This entry belongs to a different wallet. Refresh your entries.",
        );
      await claimPrize(entry.contestId, entry.tokenId);
      toast.success("Winnings claimed");
      await queryClient.invalidateQueries({ queryKey: ["myCurrentWeekPicks"] });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn’t claim winnings. Try again.",
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Card id={`entry-${entry.tokenId}`}>
      <CardContent className="space-y-5 pt-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {SEASON_TYPE_LABELS[entry.seasonType] ?? "Season"} Week{" "}
              {entry.weekNumber}
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">
              {entry.rank ? entry.placeLabel : "Awaiting kickoff"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.year} · Entry #{entry.tokenId}
              {entry.rank
                ? ` · ${entry.totalEntries} ${entry.totalEntries === 1 ? "entry" : "entries"}`
                : ` · ${entry.placeLabel}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Final correct picks</p>
            <p className="text-2xl font-black tracking-[-0.04em]">
              {finalCorrect}
              <span className="text-base font-semibold text-muted-foreground">
                /{finished || entry.totalGames}
              </span>
            </p>
            {entry.scoredGames > 0 ? (
              <p className="text-xs text-muted-foreground">
                {entry.totalGames - finished} games remaining
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {entry.totalGames} games picked
              </p>
            )}
          </div>
        </div>

        {entry.scoredGames > 0 ? (
          <Progress
            className="h-2"
            value={finished > 0 ? (finalCorrect / finished) * 100 : 0}
          />
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          {entry.games.map(game => (
            <GamePickRow key={game.gameId} game={game} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Tiebreaker {entry.tiebreakerPoints} pts ·{" "}
            {entry.gamesFinalized
              ? "Results confirmed"
              : finished === entry.totalGames
                ? "Results being confirmed"
                : finished > 0 || entry.scoredGames > 0
                  ? "Games in progress · Live standing is provisional"
                  : "Upcoming"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStandings(true)}
          >
            View standings
          </Button>
        </div>
        {entry.claimed ? (
          <p className="text-sm font-semibold">Winnings claimed</p>
        ) : entry.prizeWon > 0n && entry.gamesFinalized ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="font-semibold">
              {currencyLoading
                ? "Loading winnings…"
                : currencyError
                  ? "Winnings available"
                  : formattedValue}
            </p>
            {canClaim ? (
              <Button disabled={claiming} onClick={claim}>
                {claiming ? "Claiming…" : "Claim winnings"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {entry.payoutComplete
                  ? "Winnings distributed"
                  : `Available ${new Date(entry.payoutDeadline).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
              </p>
            )}
          </div>
        ) : entry.gamesFinalized && now >= entry.payoutDeadline ? (
          <p className="text-sm text-muted-foreground">
            No winnings for this entry.
          </p>
        ) : null}
        {standings && (
          <PickemLeaderboard
            contestId={entry.contestId}
            onClose={() => setStandings(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
