"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createThirdwebClient } from "thirdweb";
import {
  AccountAddress,
  AccountAvatar,
  AccountName,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePickemContract } from "@/hooks/usePickemContract";
import { shortenAddress } from "thirdweb/utils";

// Create Thirdweb client for AccountProvider
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

interface ContestPick {
  tokenId: number;
  owner: string;
  picks: number[];
  correctPicks: number;
  tiebreakerPoints: number;
}

interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeLogo?: string;
  awayLogo?: string;
}

interface ContestPicksViewProps {
  contestId: number;
  gameIds: string[];
  gamesFinalized: boolean;
  year: number;
  seasonType: number;
  weekNumber: number;
}

export default function ContestPicksView({
  contestId,
  gameIds,
  gamesFinalized,
  year,
  seasonType,
  weekNumber,
}: ContestPicksViewProps) {
  const account = useActiveAccount();
  const {
    getTotalNFTSupply,
    getTokenByIndex,
    getNFTPrediction,
    getUserPicks,
    getNFTOwner,
  } = usePickemContract();

  const [allPicks, setAllPicks] = useState<ContestPick[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, seasonType, weekNumber]);

  useEffect(() => {
    if (games.length > 0) {
      fetchAllPicks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, games]);

  const fetchGames = async () => {
    try {
      const response = await fetch(
        `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }
      const gamesData = await response.json();

      // Create a map for quick lookup
      const gamesMap = new Map(
        gamesData.map((game: GameInfo) => [game.gameId, game]),
      );

      // Order games to match the contest's gameIds order
      const orderedGames = gameIds
        .map(id => gamesMap.get(id))
        .filter((game): game is GameInfo => game !== undefined);

      setGames(orderedGames);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  const fetchAllPicks = async () => {
    setLoading(true);
    try {
      const totalSupply = await getTotalNFTSupply();
      const picks: ContestPick[] = [];

      // Convert string gameIds to bigint for contract call
      const gameIdsBigInt = gameIds.map(id => BigInt(id));

      // Iterate through all NFTs
      for (let i = 0; i < totalSupply; i++) {
        try {
          const tokenId = await getTokenByIndex(i);
          const prediction = await getNFTPrediction(tokenId);

          // Check if this NFT belongs to this contest
          if (Number(prediction[0]) === contestId) {
            const owner = await getNFTOwner(tokenId);
            const userPicks = await getUserPicks(tokenId, gameIdsBigInt);

            picks.push({
              tokenId,
              owner,
              picks: userPicks.map((p: number) => Number(p)),
              correctPicks: Number(prediction[4]),
              tiebreakerPoints: Number(prediction[3]),
            });
          }
        } catch (err) {
          console.log(`Error fetching token ${i}:`, err);
        }
      }

      // Sort by correct picks (highest first) when finalized
      if (gamesFinalized) {
        picks.sort((a, b) => {
          if (b.correctPicks !== a.correctPicks) {
            return b.correctPicks - a.correctPicks;
          }
          // Secondary sort by tiebreaker
          return (
            Math.abs(b.tiebreakerPoints - 50) -
            Math.abs(a.tiebreakerPoints - 50)
          );
        });
      }

      setAllPicks(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUser = (address: string) => {
    return (
      account?.address &&
      address.toLowerCase() === account.address.toLowerCase()
    );
  };

  const toggleRow = (tokenId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const renderPickCell = (
    picks: number[],
    tokenId: number,
    isExpanded: boolean,
  ) => {
    if (!isExpanded) {
      // Collapsed view: show a summary
      return (
        <div className="flex items-center gap-2">
          <Button
            className="h-8 px-2"
            size="sm"
            variant="ghost"
            onClick={() => toggleRow(tokenId)}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            <span className="text-xs">Show picks</span>
          </Button>
        </div>
      );
    }

    // Expanded view: show all picks
    return (
      <div className="space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <Button
            className="h-6 px-2"
            size="sm"
            variant="ghost"
            onClick={() => toggleRow(tokenId)}
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            <span className="text-xs">Hide picks</span>
          </Button>
        </div>
        {picks.map((pick, gameIndex) => {
          const game = games[gameIndex];
          if (!game) return null;

          const pickedAway = pick === 0;
          const pickedHome = pick === 1;

          return (
            <div
              key={gameIndex}
              className="flex items-center gap-2 text-xs border rounded p-1.5 bg-background"
            >
              {/* Game Number */}
              <span className="text-[10px] text-muted-foreground font-mono w-4">
                {gameIndex + 1}
              </span>

              {/* Away Team */}
              <div
                className={`flex items-center gap-1 flex-1 ${!pickedAway ? "opacity-30 grayscale" : "font-semibold"}`}
              >
                {game.awayLogo && (
                  <img
                    alt={game.awayTeam}
                    className="w-5 h-5"
                    src={game.awayLogo}
                  />
                )}
                <span className="text-xs whitespace-nowrap">
                  {game.awayAbbreviation || game.awayTeam}
                </span>
              </div>

              {/* @ symbol */}
              <span className="text-muted-foreground text-[10px] px-0.5">
                @
              </span>

              {/* Home Team */}
              <div
                className={`flex items-center gap-1 flex-1 justify-end ${!pickedHome ? "opacity-30 grayscale" : "font-semibold"}`}
              >
                <span className="text-xs whitespace-nowrap">
                  {game.homeAbbreviation || game.homeTeam}
                </span>
                {game.homeLogo && (
                  <img
                    alt={game.homeTeam}
                    className="w-5 h-5"
                    src={game.homeLogo}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            All Picks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allPicks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            All Picks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Picks Yet</h3>
            <p className="text-muted-foreground">
              No one has submitted picks for this contest yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            All Picks
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{allPicks.length} entries</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchAllPicks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {gamesFinalized && <TableHead className="w-16">Rank</TableHead>}
                <TableHead>Participant</TableHead>
                {gamesFinalized && <TableHead>Score</TableHead>}
                <TableHead className="w-28">Tiebreaker</TableHead>
                <TableHead>Picks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPicks.map((pick, index) => {
                const isUserPick = isCurrentUser(pick.owner);

                return (
                  <TableRow
                    key={pick.tokenId}
                    className={isUserPick ? "bg-accent/50" : ""}
                  >
                    {gamesFinalized && (
                      <TableCell>
                        <Badge
                          variant={
                            index === 0
                              ? "default"
                              : index < 3
                                ? "secondary"
                                : "outline"
                          }
                        >
                          #{index + 1}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <AccountProvider address={pick.owner} client={client}>
                        <div className="flex items-center gap-2">
                          <AccountAvatar
                            fallbackComponent={
                              <Blobbie
                                address={pick.owner}
                                className="size-8 rounded-full"
                              />
                            }
                            loadingComponent={
                              <div className="size-8 rounded-full bg-muted animate-pulse" />
                            }
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "100%",
                            }}
                          />
                          <div className="flex flex-col">
                            <div className="flex w-full items-center gap-2">
                              <AccountName
                                className="font-medium text-sm truncate"
                                fallbackComponent={
                                  <AccountAddress
                                    formatFn={addr => shortenAddress(addr)}
                                  />
                                }
                                loadingComponent={
                                  <span className="text-sm text-muted-foreground">
                                    Loading...
                                  </span>
                                }
                              />
                              {isUserPick && (
                                <Badge className="text-xs" variant="secondary">
                                  You
                                </Badge>
                              )}
                            </div>
                            {!isUserPick && (
                              <AccountAddress
                                className="text-xs text-muted-foreground truncate"
                                formatFn={addr => shortenAddress(addr)}
                              />
                            )}
                          </div>
                        </div>
                      </AccountProvider>
                    </TableCell>
                    {gamesFinalized && (
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {pick.correctPicks} / {gameIds.length}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(
                              (pick.correctPicks / gameIds.length) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      <div className="flex items-center justify-center w-full gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span>{pick.tiebreakerPoints}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderPickCell(
                        pick.picks,
                        pick.tokenId,
                        expandedRows.has(pick.tokenId),
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        {gamesFinalized && allPicks.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Contest Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Entries</p>
                <p className="font-bold">{allPicks.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Highest Score</p>
                <p className="font-bold">
                  {Math.max(...allPicks.map(p => p.correctPicks))} /{" "}
                  {gameIds.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Average Score</p>
                <p className="font-bold">
                  {(
                    allPicks.reduce((sum, p) => sum + p.correctPicks, 0) /
                    allPicks.length
                  ).toFixed(1)}{" "}
                  / {gameIds.length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Average Accuracy</p>
                <p className="font-bold">
                  {(
                    (allPicks.reduce((sum, p) => sum + p.correctPicks, 0) /
                      allPicks.length /
                      gameIds.length) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
