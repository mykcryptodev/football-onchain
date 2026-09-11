"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CircleDot, Minus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveAccount } from "thirdweb/react";

import PickemGameDialog from "@/components/pickem/PickemGameDialog";
import PickemLeaderboard from "@/components/pickem/PickemLeaderboard";
import PickemShareImage from "@/components/pickem/PickemShareImage";
import PickerAvatars from "@/components/pickem/PickerAvatars";
import TeamMark from "@/components/pickem/TeamMark";
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
  formatLiveGameStatus,
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
    case "live-tied":
      return "border-primary/30 bg-primary/10";
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
  if (
    result === "live-winning" ||
    result === "live-losing" ||
    result === "live-tied"
  ) {
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
    case "live-tied":
      return "Tied";
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
  const liveStatus = formatLiveGameStatus(game);
  if (liveStatus) {
    return liveStatus;
  }
  return game.kickoff
    ? formatKickoffTime(game.kickoff, {
        dateOptions: { weekday: "short", month: "short", day: "numeric" },
        timeOptions: { hour: "numeric", minute: "2-digit" },
      })
    : "Schedule unavailable";
}

function isLiveResult(result: CurrentWeekGamePick["result"]) {
  return (
    result === "live-winning" ||
    result === "live-losing" ||
    result === "live-tied"
  );
}

// Bold the side that's ahead, dim the side that's behind, leave ties neutral.
// Independent of the pick, which TeamMark already highlights.
function scoreClass(score: number, opponentScore: number) {
  if (score === opponentScore) return undefined;
  return score > opponentScore ? "font-bold" : "text-muted-foreground";
}

function GamePickRow({ game }: { game: CurrentWeekGamePick }) {
  const pickedAway = game.pick === 0;
  const pickedHome = game.pick === 1;
  const awayScore = game.awayScore;
  const homeScore = game.homeScore;
  const hasScore = homeScore !== undefined && awayScore !== undefined;
  const showScore =
    hasScore &&
    (game.result === "correct" ||
      game.result === "wrong" ||
      isLiveResult(game.result) ||
      isGameInProgress(game.status, homeScore, awayScore));
  const statusLabel = gameStatusLabel(game);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
          resultStyles(game.result),
        )}
        onClick={() => setDetailsOpen(true)}
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-background/80">
          <ResultIcon result={game.result} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            {isLiveResult(game.result) ? (
              <span className="flex items-center gap-1.5 font-semibold text-red-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
                LIVE · {resultLabel(game.result)}
              </span>
            ) : (
              <span>{resultLabel(game.result)}</span>
            )}
            <span className="tabular-nums">{statusLabel}</span>
          </div>
          {/* Scoreboard rows: away on top, home below, each score on its team's line. */}
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <TeamMark
                abbreviation={game.awayAbbreviation}
                logo={game.awayLogo}
                name={game.awayTeam}
                picked={pickedAway}
              />
              <div className="flex shrink-0 items-center gap-3">
                <PickerAvatars addresses={game.awayPickers} />
                {showScore ? (
                  <span
                    className={cn(
                      "w-6 text-right font-mono text-sm tabular-nums",
                      scoreClass(awayScore, homeScore),
                    )}
                  >
                    {awayScore}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <TeamMark
                abbreviation={game.homeAbbreviation}
                logo={game.homeLogo}
                name={game.homeTeam}
                picked={pickedHome}
              />
              <div className="flex shrink-0 items-center gap-3">
                <PickerAvatars addresses={game.homePickers} />
                {showScore ? (
                  <span
                    className={cn(
                      "w-6 text-right font-mono text-sm tabular-nums",
                      scoreClass(homeScore, awayScore),
                    )}
                  >
                    {homeScore}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </button>
      <PickemGameDialog
        game={game}
        open={detailsOpen}
        showScore={showScore}
        statusLabel={statusLabel}
        onOpenChange={setDetailsOpen}
      />
    </>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStandings(true)}
            >
              View standings
            </Button>
            <PickemShareImage
              key={`${entry.contestId}:${entry.tokenId}`}
              compact
              contestId={entry.contestId}
              tokenId={String(entry.tokenId)}
            />
          </div>
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
