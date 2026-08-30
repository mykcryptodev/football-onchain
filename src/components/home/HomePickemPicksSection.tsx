"use client";

import { ArrowRight, Check, CircleDot, Minus, Trophy, X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { featuredPickemContestIds } from "@/constants";
import {
  type CurrentWeekGamePick,
  type CurrentWeekPickemEntry,
  useMyCurrentWeekPicks,
} from "@/hooks/useMyCurrentWeekPicks";
import { formatKickoffTime } from "@/lib/date";
import { isFinishedTie, SEASON_TYPE_LABELS } from "@/lib/pickem-scoring";
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
  if (game.result === "live-winning" || game.result === "live-losing") {
    return "Live";
  }
  return formatKickoffTime(game.kickoff, {
    dateOptions: { weekday: "short", month: "short", day: "numeric" },
    timeOptions: { hour: "numeric", minute: "2-digit" },
  });
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
  const finishedTie = isFinishedTie(game);
  const pickedAway = !finishedTie && game.pick === 0;
  const pickedHome = !finishedTie && game.pick === 1;
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined;
  const showScore =
    hasScore &&
    (game.result === "correct" ||
      game.result === "wrong" ||
      game.result === "live-winning" ||
      game.result === "live-losing");

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
          <span>{resultLabel(game.result)}</span>
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

function EntryCard({ entry }: { entry: CurrentWeekPickemEntry }) {
  const accuracy =
    entry.scoredGames > 0 ? (entry.correctPicks / entry.scoredGames) * 100 : 0;

  return (
    <Card>
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
              Contest #{entry.contestId}
              {entry.rank
                ? ` · ${entry.totalEntries} ${entry.totalEntries === 1 ? "entry" : "entries"}`
                : ` · ${entry.placeLabel}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Correct picks</p>
            <p className="text-2xl font-black tracking-[-0.04em]">
              {entry.correctPicks}
              <span className="text-base font-semibold text-muted-foreground">
                /{entry.scoredGames || entry.totalGames}
              </span>
            </p>
            {entry.scoredGames > 0 ? (
              <p className="text-xs text-muted-foreground">
                {accuracy.toFixed(0)}% of games played
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {entry.totalGames} games picked
              </p>
            )}
          </div>
        </div>

        {entry.scoredGames > 0 ? (
          <Progress className="h-2" value={accuracy} />
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          {entry.games.map(game => (
            <GamePickRow key={game.gameId} game={game} />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Tiebreaker {entry.tiebreakerPoints} pts
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/pickem/${entry.contestId}`}>
              View contest <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePickemPicksSection() {
  const { isConnected, isLoading, currentWeek, entries } =
    useMyCurrentWeekPicks();
  const featuredContestId = featuredPickemContestIds[0];
  const displayWeek = entries[0]?.weekNumber ?? currentWeek?.week;
  const seasonType = entries[0]?.seasonType ?? currentWeek?.seasonType;
  const seasonLabel = seasonType
    ? (SEASON_TYPE_LABELS[seasonType] ?? "Season")
    : null;
  const weekLabel = displayWeek ? `Week ${displayWeek}` : "this week";
  const heading =
    displayWeek && seasonLabel
      ? `Your ${seasonLabel} ${weekLabel} Pick'em`
      : "Your Pick'em";

  return (
    <section className="border-b">
      <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Your board
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-4xl">
              {heading}
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Every game you picked, live results, and where you sit in the
              pool.
            </p>
          </div>
          {isConnected && entries.length > 0 ? (
            <Badge variant="secondary">
              <Trophy className="size-3.5" />
              {entries.length} {entries.length === 1 ? "pool" : "pools"}
            </Badge>
          ) : null}
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Connect to see your picks
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Log in to track{" "}
                  {seasonLabel ? `${seasonLabel} ${weekLabel}` : weekLabel}{" "}
                  games, scores, and your place in the contest.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Use Login in the top right.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="grid gap-2 md:grid-cols-2">
                  {[1, 2, 3, 4].map(item => (
                    <Skeleton key={item} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  No {seasonLabel ? `${seasonLabel} ${weekLabel}` : weekLabel}{" "}
                  picks yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter a pool to see each game, your record, and live place on
                  this page.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/pickem">
                    Browse Pick&apos;em <ArrowRight />
                  </Link>
                </Button>
                {featuredContestId !== undefined ? (
                  <Button asChild variant="outline">
                    <Link href={`/pickem/${featuredContestId}`}>
                      Join featured pool
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {entries.map(entry => (
              <EntryCard
                key={`${entry.contestId}-${entry.tokenId}`}
                entry={entry}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
