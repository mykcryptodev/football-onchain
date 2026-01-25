"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { getContract } from "thirdweb";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import { useActiveAccount } from "thirdweb/react";

import { ContestCard } from "@/components/contest/ContestCard";
import type { GameScore } from "@/components/contest/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { boxes, chain, featuredContestIds } from "@/constants";
import { useBoxesContests } from "@/hooks/useBoxesContests";
import { client } from "@/providers/Thirdweb";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Contests Available</h3>
      <p className="text-muted-foreground">{message}</p>
      <Link href="/contest/create">
        <Button className="mt-4" variant="outline">
          Create a Contest
        </Button>
      </Link>
    </div>
  );
}

function getMatchupLabel(gameScore?: GameScore | null, gameId?: number) {
  if (!gameScore) {
    return gameId ? `Game ${gameId}` : "Game";
  }

  const homeLabel =
    gameScore.homeTeamAbbreviation || gameScore.homeTeamName || "Home";
  const awayLabel =
    gameScore.awayTeamAbbreviation || gameScore.awayTeamName || "Away";

  return `${awayLabel} @ ${homeLabel}`;
}

function JoinContestContent() {
  const account = useActiveAccount();
  const { contests, isLoading, error } = useBoxesContests();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "open" ||
    tabParam === "closed" ||
    tabParam === "all" ||
    tabParam === "yours"
      ? tabParam
      : "open";
  const gameFilterParam = searchParams.get("gameId") ?? "all";
  const selectedGameId =
    gameFilterParam === "all" ? "all" : gameFilterParam;

  const boxesAddress = boxes[chain.id];
  const { data: ownedContestIds = [], isLoading: isLoadingOwnedContests } =
    useQuery({
      queryKey: ["owned-contests", account?.address],
      enabled: Boolean(account?.address && boxesAddress),
      queryFn: async () => {
        if (!account?.address || !boxesAddress) {
          return [];
        }

        const boxesContract = getContract({
          client,
          chain,
          address: boxesAddress,
        });

        const ownedNFTs = await getOwnedNFTs({
          contract: boxesContract,
          owner: account.address,
        });

        const ownedContestIdsSet = new Set<number>();

        ownedNFTs.forEach(nft => {
          const tokenId = Number(nft.id);
          if (!Number.isNaN(tokenId)) {
            ownedContestIdsSet.add(Math.floor(tokenId / 100));
          }
        });

        return Array.from(ownedContestIdsSet);
      },
      staleTime: 2 * 60 * 1000,
    });

  const gameIds = useMemo(() => {
    const unique = new Set<number>();
    contests.forEach(contest => unique.add(contest.gameId));
    return Array.from(unique).sort((a, b) => a - b);
  }, [contests]);

  const gameScoreQueries = useQueries({
    queries: gameIds.map(gameId => ({
      queryKey: ["game-score", gameId],
      queryFn: async () => {
        const response = await fetch(`/api/games/${gameId}/scores`);
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<GameScore>;
      },
      enabled: gameIds.length > 0,
      staleTime: 60 * 1000,
    })),
  });

  const gameScoresMap = useMemo(() => {
    const map = new Map<number, GameScore | null>();
    gameIds.forEach((gameId, index) => {
      const data = gameScoreQueries[index]?.data ?? null;
      map.set(gameId, data);
    });
    return map;
  }, [gameIds, gameScoreQueries]);

  const filteredContests = useMemo(() => {
    if (selectedGameId === "all") {
      return contests;
    }
    return contests.filter(
      contest => contest.gameId.toString() === selectedGameId,
    );
  }, [contests, selectedGameId]);

  const openContests = useMemo(
    () =>
      filteredContests.filter(
        c => c.boxesCanBeClaimed && c.boxesClaimed < 100,
      ),
    [filteredContests],
  );
  const closedContests = useMemo(
    () =>
      filteredContests.filter(
        c => !c.boxesCanBeClaimed && c.boxesClaimed < 100,
      ),
    [filteredContests],
  );
  const ownedContestIdSet = useMemo(
    () => new Set(ownedContestIds),
    [ownedContestIds],
  );
  const yoursContests = useMemo(
    () =>
      filteredContests.filter(contest => ownedContestIdSet.has(contest.id)),
    [filteredContests, ownedContestIdSet],
  );

  const yoursCount = account?.address
    ? isLoadingOwnedContests
      ? "..."
      : yoursContests.length
    : 0;

  const featuredContests = useMemo(() => {
    if (featuredContestIds.length === 0) {
      return [];
    }

    const contestMap = new Map(
      filteredContests.map(contest => [contest.id, contest]),
    );
    return featuredContestIds
      .map(id => contestMap.get(id))
      .filter((contest): contest is (typeof contests)[number] =>
        Boolean(contest),
      );
  }, [filteredContests]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-500">
              Error Loading Contests
            </h1>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Join a Contest</h1>
          <p className="text-xl text-muted-foreground">
            Browse and join available football squares contests
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Contests List */}
        {!isLoading && contests.length === 0 && (
          <EmptyState message="No contests have been created yet. Be the first!" />
        )}

        {!isLoading && contests.length > 0 && (
          <Tabs
            className="space-y-6"
            value={activeTab}
            onValueChange={value => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set("tab", value);
              router.replace(`${pathname}?${nextParams.toString()}`);
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">
                  All ({filteredContests.length})
                </TabsTrigger>
                <TabsTrigger value="open">
                  Open ({openContests.length})
                </TabsTrigger>
                <TabsTrigger value="yours">Yours ({yoursCount})</TabsTrigger>
                <TabsTrigger value="closed">
                  Closed ({closedContests.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Filter by game</span>
                <Select
                  value={selectedGameId}
                  onValueChange={value => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("gameId", value);
                    router.replace(`${pathname}?${nextParams.toString()}`);
                  }}
                >
                  <SelectTrigger className="w-[220px] bg-background">
                    <SelectValue placeholder="All games" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All games</SelectItem>
                    {gameIds.map(gameId => (
                      <SelectItem key={gameId} value={gameId.toString()}>
                        {getMatchupLabel(gameScoresMap.get(gameId), gameId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {featuredContests.length > 0 && (
              <section className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Featured Contests
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Hand-picked contests highlighted by the community.
                    </p>
                  </div>
                  <Badge variant="default">Featured</Badge>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {featuredContests.map(contest => (
                    <ContestCard key={contest.id} contest={contest} />
                  ))}
                </div>
              </section>
            )}

            <TabsContent className="space-y-4" value="all">
              {filteredContests.length === 0 ? (
                <EmptyState message="No contests match that game filter." />
              ) : (
                filteredContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="open">
              {openContests.length === 0 ? (
                <EmptyState message="No open contests available right now." />
              ) : (
                openContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="yours">
              {!account?.address ? (
                <EmptyState message="Connect your wallet to see contests you've joined." />
              ) : isLoadingOwnedContests ? (
                <LoadingSkeleton />
              ) : yoursContests.length === 0 ? (
                <EmptyState message="You haven't claimed any boxes yet." />
              ) : (
                yoursContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="closed">
              {closedContests.length === 0 ? (
                <EmptyState message="No closed contests." />
              ) : (
                closedContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default function JoinContestPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JoinContestContent />
    </Suspense>
  );
}
