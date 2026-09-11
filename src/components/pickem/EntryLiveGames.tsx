"use client";
import { useQuery } from "@tanstack/react-query";

import { GamePickRow } from "@/components/pickem/PickemEntryCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildGamePicks,
  type WeekGameApi,
} from "@/hooks/useMyCurrentWeekPicks";
import type { ContestEntrySnapshot } from "@/lib/pickem-contest-entries";
import { formatPlace, isGameComplete, rankEntries } from "@/lib/pickem-scoring";
import { queryKeys } from "@/lib/query-keys";

/**
 * Live scoreboard for one entry: the same game rows and leaderboard place as
 * the pick'em card on the home page, polling scores every 30s.
 */
export default function EntryLiveGames({
  tokenId,
  owner,
  year,
  seasonType,
  weekNumber,
  gameIds,
  tiebreakerGameId,
  entries,
}: {
  tokenId: number;
  owner: string;
  year: number;
  seasonType: number;
  weekNumber: number;
  gameIds: string[];
  tiebreakerGameId: string;
  entries: ContestEntrySnapshot[];
}) {
  const { data: games } = useQuery({
    queryKey: queryKeys.weekGames(year, seasonType, weekNumber),
    queryFn: async (): Promise<WeekGameApi[]> => {
      const response = await fetch(
        `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
      );
      if (!response.ok) throw new Error("Failed to fetch week games");
      return response.json();
    },
    refetchInterval: 30 * 1000,
  });

  if (!games) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const entry = entries.find(e => e.tokenId === tokenId);
  const gamePicks = buildGamePicks(
    gameIds,
    games,
    entry?.picks ?? [],
    entries,
    owner,
  );
  const ranked = rankEntries(entries, gameIds, games, tiebreakerGameId).find(
    r => r.tokenId === tokenId,
  );
  const finished = gamePicks.filter(g =>
    isGameComplete(g.status, g.completed),
  ).length;
  const correct = gamePicks.filter(g => g.result === "correct").length;
  const entryCount = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4 rounded-2xl border p-4">
        <div>
          <p className="text-sm text-muted-foreground">Leaderboard</p>
          <p className="text-2xl font-black tracking-[-0.04em]">
            {ranked && ranked.scoredGames > 0
              ? `${formatPlace(ranked.rank)} of ${entries.length}`
              : "Awaiting kickoff"}
          </p>
          <p className="text-xs text-muted-foreground">{entryCount}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Correct picks</p>
          <p className="text-2xl font-black tracking-[-0.04em]">
            {correct}
            <span className="text-base font-semibold text-muted-foreground">
              /{finished || gameIds.length}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {finished > 0
              ? `${gameIds.length - finished} games remaining`
              : `${gameIds.length} games picked`}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {gamePicks.map(game => (
          <GamePickRow key={game.gameId} game={game} owner={owner} />
        ))}
      </div>
    </section>
  );
}
