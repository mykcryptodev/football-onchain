"use client";

import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentNflWeek } from "@/hooks/useCurrentNflWeek";
import { type UserPickemEntry, useUserPickems } from "@/hooks/useUserPickems";
import { useWeekGames } from "@/hooks/useWeekGames";
import { isCurrentWeekPickem, pairPicksWithGames } from "@/lib/pickem-choices";

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

function UserPickemEntryCard({ entry }: { entry: UserPickemEntry }) {
  const { games, isLoading } = useWeekGames({
    year: entry.year,
    seasonType: entry.seasonType,
    weekNumber: entry.weekNumber,
    gameIds: entry.gameIds,
  });

  const choices = pairPicksWithGames(entry.gameIds, entry.picks, games);
  const scored = choices.filter(choice => choice.status !== "pending");
  const correct = scored.filter(choice => choice.status === "correct").length;
  const seasonLabel = SEASON_TYPE_LABELS[entry.seasonType] ?? "Season";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {seasonLabel} Week {entry.weekNumber}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.year} • Contest #{entry.contestId}
            </p>
          </div>
          {scored.length > 0 ? (
            <p className="text-sm font-medium">
              {correct} / {scored.length} correct
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {entry.picks.filter(pick => pick === 0 || pick === 1).length} /{" "}
              {entry.gameIds.length} picks
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-10 w-full" />
            ))}
          </div>
        ) : choices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Games for this week are not available yet.
          </p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto">
            {choices.map(({ game, pick, status }) => {
              const pickedAway = pick === 0;
              const pickedHome = pick === 1;

              return (
                <div
                  key={game.gameId}
                  className={`flex items-center gap-2 rounded-lg border p-1.5 text-xs ${
                    status === "correct"
                      ? "border-green-500/30 bg-green-500/10"
                      : status === "wrong"
                        ? "border-red-500/30 bg-red-500/10"
                        : "bg-background"
                  }`}
                >
                  <div
                    className={`flex flex-1 items-center gap-1 ${
                      pickedAway ? "font-semibold" : "opacity-30 grayscale"
                    }`}
                  >
                    {game.awayLogo ? (
                      <img
                        alt={game.awayTeam}
                        className="h-5 w-5"
                        src={game.awayLogo}
                      />
                    ) : null}
                    <span className="whitespace-nowrap">
                      {game.awayAbbreviation || game.awayTeam}
                    </span>
                  </div>
                  <span className="px-0.5 text-[10px] text-muted-foreground">
                    @
                  </span>
                  <div
                    className={`flex flex-1 items-center justify-end gap-1 ${
                      pickedHome ? "font-semibold" : "opacity-30 grayscale"
                    }`}
                  >
                    <span className="whitespace-nowrap">
                      {game.homeAbbreviation || game.homeTeam}
                    </span>
                    {game.homeLogo ? (
                      <img
                        alt={game.homeTeam}
                        className="h-5 w-5"
                        src={game.homeLogo}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/pickem/${entry.contestId}`}>View contest</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomePickemHighlights() {
  const account = useActiveAccount();
  const { currentWeek, isLoading: isLoadingWeek } = useCurrentNflWeek();
  const { entries, isLoading: isLoadingEntries } = useUserPickems();
  const thisWeekEntries = entries.filter(entry =>
    isCurrentWeekPickem(entry, currentWeek),
  );
  const isLoading = isLoadingWeek || isLoadingEntries;

  if (account && !isLoading && thisWeekEntries.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="mb-4">
        <h2 className="text-3xl font-bold">Your Pick&apos;em Choices</h2>
        <p className="text-muted-foreground">
          This week&apos;s games and the winners you picked.
        </p>
      </div>

      {!account ? (
        <Card>
          <CardContent className="py-6 text-muted-foreground">
            Connect your wallet to see your Pick&apos;em choices for this week.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-6 text-muted-foreground">
            Loading your Pick&apos;em choices...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {thisWeekEntries.map(entry => (
            <UserPickemEntryCard
              key={`${entry.contestId}-${entry.tokenId}`}
              entry={entry}
            />
          ))}
        </div>
      )}
    </section>
  );
}
