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
import { shortenAddress } from "thirdweb/utils";

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
  liveCorrectPicks?: number;
  liveTotalScoredGames?: number;
  liveRank?: number;
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
  tiebreakerGameId: string;
}

export default function ContestPicksView({
  contestId,
  gameIds,
  gamesFinalized,
  year,
  seasonType,
  weekNumber,
  tiebreakerGameId,
}: ContestPicksViewProps) {
  const account = useActiveAccount();
  const {
    getTotalNFTSupply,
    getTokenByIndex,
    getNFTPrediction,
    getUserPicks,
    getNFTOwner,
  } = usePickemContract();

  const [mounted, setMounted] = useState(false);
  const [allPicks, setAllPicks] = useState<ContestPick[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [loadingLiveRankings, setLoadingLiveRankings] = useState(false);
  const [gameResults, setGameResults] = useState<Map<string, number | null>>(
    new Map(),
  ); // gameId -> winner (0=away, 1=home, null=tied/no result)

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, seasonType, weekNumber, mounted]);

  useEffect(() => {
    if (games.length > 0) {
      fetchAllPicks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, games]);

  // Fetch live rankings and game results (initial load only)
  useEffect(() => {
    if (allPicks.length > 0) {
      // Always fetch live rankings to show current scores
      fetchLiveRankings();

      if (gamesFinalized) {
        // Also fetch game results for finalized games to show correct/wrong indicators
        fetchGameResults();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesFinalized, allPicks.length, contestId]);

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
        // Fetch the tiebreaker game's actual total for proper sorting
        let actualTiebreakerTotal = 0;
        try {
          const response = await fetch(
            `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
          );
          if (response.ok) {
            const gamesData = (await response.json()) as Array<{
              gameId: string;
              homeScore?: number;
              awayScore?: number;
            }>;
            // Get the tiebreaker game from oracle (or fall back to last game)
            const tiebreakerGameIdToUse =
              tiebreakerGameId || gameIds[gameIds.length - 1];
            const tiebreakerGame = gamesData.find(
              g => g.gameId === tiebreakerGameIdToUse,
            );
            if (
              tiebreakerGame &&
              tiebreakerGame.homeScore !== undefined &&
              tiebreakerGame.awayScore !== undefined
            ) {
              actualTiebreakerTotal =
                tiebreakerGame.homeScore + tiebreakerGame.awayScore;
            }
          }
        } catch (err) {
          console.error("Error fetching tiebreaker game total:", err);
        }

        picks.sort((a, b) => {
          if (b.correctPicks !== a.correctPicks) {
            return b.correctPicks - a.correctPicks;
          }
          // Secondary sort by tiebreaker - closer to actual total wins
          if (actualTiebreakerTotal > 0) {
            const aDiff = Math.abs(a.tiebreakerPoints - actualTiebreakerTotal);
            const bDiff = Math.abs(b.tiebreakerPoints - actualTiebreakerTotal);
            return aDiff - bDiff; // Lower difference = better rank
          }
          // Fallback if tiebreaker game total not available
          return 0;
        });
      }

      setAllPicks(picks);
    } catch (error) {
      console.error("Error fetching picks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameResults = async () => {
    try {
      // Fetch game results from ESPN API to show correct/wrong indicators
      const response = await fetch(
        `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
      );
      if (!response.ok) return;

      const gamesData = (await response.json()) as Array<{
        gameId: string;
        status?: string;
        homeScore?: number;
        awayScore?: number;
      }>;
      console.log("fetchGameResults gamesData", gamesData);
      const resultsMap = new Map<string, number | null>();

      gamesData.forEach(game => {
        // Only show results for completed games
        const isCompleted =
          game.status &&
          (game.status.toLowerCase().includes("final") ||
            game.status === "STATUS_FINAL");

        if (
          isCompleted &&
          game.homeScore !== undefined &&
          game.awayScore !== undefined
        ) {
          let winner: number | null = null;
          if (game.homeScore > game.awayScore) {
            winner = 1; // home wins
          } else if (game.awayScore > game.homeScore) {
            winner = 0; // away wins
          }
          resultsMap.set(game.gameId, winner);
        }
      });

      setGameResults(resultsMap);
    } catch (error) {
      console.error("Error fetching game results:", error);
    }
  };

  const fetchLiveRankings = async () => {
    if (allPicks.length === 0) return;

    setLoadingLiveRankings(true);
    try {
      const response = await fetch(`/api/contest/${contestId}/live-rankings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameIds,
          tiebreakerGameId,
          picks: allPicks,
          year,
          seasonType,
          weekNumber,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch live rankings");
      }

      const data = await response.json();

      // Update picks with live ranking data
      setAllPicks(data.picks);

      // Update game results for showing correct/wrong indicators (only completed games)
      if (data.gameScores) {
        const resultsMap = new Map<string, number | null>();
        data.gameScores.forEach(
          (score: {
            gameId: string;
            winner: number | null;
            completed: boolean;
          }) => {
            // Only show indicators for completed games
            if (score.completed) {
              resultsMap.set(score.gameId, score.winner);
            }
          },
        );
        setGameResults(resultsMap);
      }
    } catch (error) {
      console.error("Error fetching live rankings:", error);
    } finally {
      setLoadingLiveRankings(false);
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
          const gameId = gameIds[gameIndex];
          const winner = gameResults.get(gameId);

          // Determine if pick is correct/wrong
          let pickStatus: "correct" | "wrong" | "pending" = "pending";
          if (winner !== null && winner !== undefined) {
            pickStatus = pick === winner ? "correct" : "wrong";
          }

          return (
            <div
              key={gameIndex}
              className={`flex items-center gap-2 text-xs border rounded p-1.5 ${
                pickStatus === "correct"
                  ? "bg-green-500/10 border-green-500/30"
                  : pickStatus === "wrong"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-background"
              }`}
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

  // Show loading state before mounting and while loading
  if (!mounted || loading) {
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
            {!gamesFinalized && loadingLiveRankings && (
              <Badge className="text-[10px] px-1.5 animate-pulse">
                Updating...
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{allPicks.length} entries</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                fetchAllPicks();
                if (!gamesFinalized) {
                  fetchLiveRankings();
                } else {
                  fetchGameResults();
                }
              }}
            >
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
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="w-32 text-right">Score</TableHead>
                <TableHead className="w-28">Tiebreaker</TableHead>
                <TableHead>Picks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPicks.map((pick, index) => {
                const isUserPick = isCurrentUser(pick.owner);
                const displayRank = gamesFinalized ? index + 1 : pick.liveRank;
                // Check if we have live data from ESPN, regardless of finalized state
                const hasLiveData = pick.liveCorrectPicks !== undefined;

                return (
                  <TableRow
                    key={pick.tokenId}
                    className={isUserPick ? "bg-accent/50" : ""}
                  >
                    <TableCell className="w-20">
                      {displayRank ? (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              displayRank === 1
                                ? "default"
                                : displayRank < 4
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            #{displayRank}
                          </Badge>
                        </div>
                      ) : (
                        <Skeleton className="h-4 w-8" />
                      )}
                    </TableCell>
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
                    <TableCell className="w-32">
                      {hasLiveData && pick.liveCorrectPicks !== undefined ? (
                        <div className="flex flex-col min-w-[100px]">
                          <span className="font-semibold whitespace-nowrap text-right">
                            {pick.liveCorrectPicks} /{" "}
                            {pick.liveTotalScoredGames || gameIds.length}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
                            {pick.liveTotalScoredGames
                              ? (
                                  (pick.liveCorrectPicks /
                                    pick.liveTotalScoredGames) *
                                  100
                                ).toFixed(0)
                              : "0"}
                            %
                          </span>
                        </div>
                      ) : gamesFinalized && pick.correctPicks > 0 ? (
                        <div className="flex flex-col min-w-[100px]">
                          <span className="font-semibold whitespace-nowrap text-right">
                            {pick.correctPicks} / {gameIds.length}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
                            {(
                              (pick.correctPicks / gameIds.length) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      ) : (
                        <Skeleton className="h-4 w-16 justify-end" />
                      )}
                    </TableCell>
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
        {gamesFinalized &&
          allPicks.length > 0 &&
          (() => {
            // Check if any picks have live data
            const hasAnyLiveData = allPicks.some(
              p => p.liveCorrectPicks !== undefined,
            );

            return (
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
                      {Math.max(
                        ...allPicks.map(p =>
                          hasAnyLiveData && p.liveCorrectPicks !== undefined
                            ? p.liveCorrectPicks
                            : p.correctPicks,
                        ),
                      )}{" "}
                      / {gameIds.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Score</p>
                    <p className="font-bold">
                      {(
                        allPicks.reduce(
                          (sum, p) =>
                            sum +
                            (hasAnyLiveData && p.liveCorrectPicks !== undefined
                              ? p.liveCorrectPicks
                              : p.correctPicks),
                          0,
                        ) / allPicks.length
                      ).toFixed(1)}{" "}
                      / {gameIds.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Accuracy</p>
                    <p className="font-bold">
                      {(
                        (allPicks.reduce(
                          (sum, p) =>
                            sum +
                            (hasAnyLiveData && p.liveCorrectPicks !== undefined
                              ? p.liveCorrectPicks
                              : p.correctPicks),
                          0,
                        ) /
                          allPicks.length /
                          gameIds.length) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
}
