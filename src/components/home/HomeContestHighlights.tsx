"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ZERO_ADDRESS } from "thirdweb";
import {
  AccountAvatar,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";
import { shortenAddress } from "thirdweb/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chain, contests } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  getNetRewards,
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
} from "@/lib/payout-utils";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

import {
  BoxOwner,
  Contest,
  GameScore,
  PayoutStrategyType,
} from "../contest/types";

interface ContestListItem {
  id: number;
  gameId: number;
  title: string;
  description: string;
}

interface ContestApiResponse {
  id: string;
  gameId: string;
  creator: string;
  rows: number[];
  cols: number[];
  boxCost: {
    currency: string;
    amount: string | number;
  };
  boxesCanBeClaimed: boolean;
  payoutsPaid: {
    totalPayoutsMade: number;
    totalAmountPaid: string | number;
  };
  totalRewards: string | number;
  boxesClaimed: string | number;
  randomValuesSet: boolean;
  title: string;
  description: string;
  payoutStrategy: string;
  boxes?: BoxOwner[];
}

interface ContestQueryData {
  contest: Contest;
  boxOwners: BoxOwner[];
}

interface GameDetails {
  gameId: string;
  date?: string;
}

interface UserBoxEntry {
  contestId: number;
  contestTitle: string;
  gameId: number;
  gameDate: Date;
  boxPosition: number;
  tokenId: number;
  boxRowDigit?: number;
  boxColDigit?: number;
  randomValuesSet: boolean;
  homeTeamLabel: string;
  awayTeamLabel: string;
  matchup: string;
  ownerAddress: string;
}

interface WinningBoxEntry {
  contestId: number;
  contestTitle: string;
  gameId: number;
  gameDate: Date;
  boxPosition: number;
  tokenId: number;
  boxRowDigit: number;
  boxColDigit: number;
  homeTeamLabel: string;
  awayTeamLabel: string;
  owner: string;
  totalAmount: number;
  currencyAddress: string;
  matchup: string;
}

function formatContestData(data: ContestApiResponse): ContestQueryData {
  const boxCostAmount =
    typeof data.boxCost.amount === "string"
      ? data.boxCost.amount
      : String(data.boxCost.amount);

  const totalAmountPaid =
    typeof data.payoutsPaid.totalAmountPaid === "string"
      ? Number(BigInt(data.payoutsPaid.totalAmountPaid))
      : data.payoutsPaid.totalAmountPaid;

  const totalRewards =
    typeof data.totalRewards === "string"
      ? Number(BigInt(data.totalRewards))
      : data.totalRewards;

  const boxesClaimed =
    typeof data.boxesClaimed === "string"
      ? Number(BigInt(data.boxesClaimed))
      : data.boxesClaimed;

  return {
    contest: {
      id: parseInt(data.id, 10),
      gameId: parseInt(data.gameId, 10),
      creator: data.creator,
      rows: data.rows,
      cols: data.cols,
      boxCost: {
        currency: data.boxCost.currency,
        amount: boxCostAmount,
      },
      boxesCanBeClaimed: data.boxesCanBeClaimed,
      payoutsPaid: {
        totalPayoutsMade: data.payoutsPaid.totalPayoutsMade,
        totalAmountPaid,
      },
      totalRewards,
      boxesClaimed,
      randomValuesSet: data.randomValuesSet,
      title: data.title,
      description: data.description,
      payoutStrategy: data.payoutStrategy,
    },
    boxOwners: data.boxes ?? [],
  };
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

function getTeamLabels(gameScore?: GameScore | null) {
  return {
    homeLabel: gameScore?.homeTeamAbbreviation || gameScore?.homeTeamName || "Home",
    awayLabel: gameScore?.awayTeamAbbreviation || gameScore?.awayTeamName || "Away",
  };
}

function isRealUser(owner: string) {
  if (!owner) return false;
  if (owner.toLowerCase() === ZERO_ADDRESS.toLowerCase()) return false;
  return owner.toLowerCase() !== contests[chain.id]?.toLowerCase();
}

function findBoxPosition(contest: Contest, homeDigit: number, awayDigit: number) {
  const rowIndex = contest.rows.findIndex(value => value === homeDigit);
  const colIndex = contest.cols.findIndex(value => value === awayDigit);

  if (rowIndex < 0 || colIndex < 0) {
    return null;
  }

  return rowIndex * 10 + colIndex;
}

function BoxOwnerInfo({ address }: { address: string }) {
  const { profile } = useUserProfile(address);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const displayName =
    profile?.name && profile.name.trim() ? profile.name : shortenAddress(address);

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <Avatar className="h-6 w-6">
          <AvatarImage alt={profile?.name || "User avatar"} src={avatarUrl} />
          <AvatarFallback className="bg-transparent p-0">
            <Blobbie address={address} className="size-6 rounded-full" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <AccountProvider address={address} client={client}>
          <AccountAvatar
            fallbackComponent={
              <Blobbie address={address} className="size-6 rounded-full" />
            }
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "100%",
            }}
          />
        </AccountProvider>
      )}
      <span className="truncate">{displayName}</span>
    </div>
  );
}

function PrizeAmount({
  amount,
  currencyAddress,
}: {
  amount: number;
  currencyAddress: string;
}) {
  const { formattedValue, isLoading } = useFormattedCurrency({
    amount: BigInt(Math.floor(amount)),
    currencyAddress,
  });

  if (isLoading) {
    return <span>...</span>;
  }

  return <span>{formattedValue}</span>;
}

const WINNING_BOXES_PAGE_SIZE = 5;

export function HomeContestHighlights() {
  const account = useActiveAccount();
  const walletAddress = account?.address?.toLowerCase();
  const ownerAddress = account?.address;

  const contestsQuery = useQuery<ContestListItem[]>({
    queryKey: ["contests"],
    queryFn: async () => {
      const response = await fetch(`/api/contests?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contests");
      }
      return response.json();
    },
  });

  const contestIds = useMemo(
    () => (contestsQuery.data ?? []).map(contest => contest.id),
    [contestsQuery.data],
  );

  const gameIds = useMemo(() => {
    const unique = new Set<number>();
    (contestsQuery.data ?? []).forEach(contest => unique.add(contest.gameId));
    return Array.from(unique);
  }, [contestsQuery.data]);

  const contestDetailsQueries = useQueries({
    queries: contestIds.map(contestId => ({
      queryKey: ["contest", contestId],
      queryFn: async () => {
        const response = await fetch(`/api/contest/${contestId}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch contest details");
        }
        return response.json() as Promise<ContestApiResponse>;
      },
      enabled: contestIds.length > 0,
    })),
  });

  const gameDetailsQueries = useQueries({
    queries: gameIds.map(gameId => ({
      queryKey: ["game-details", gameId],
      queryFn: async () => {
        const response = await fetch(`/api/games/${gameId}/details`);
        if (!response.ok) {
          throw new Error("Failed to fetch game details");
        }
        return response.json() as Promise<GameDetails>;
      },
      enabled: gameIds.length > 0,
    })),
  });

  const gameScoresQueries = useQueries({
    queries: gameIds.map(gameId => ({
      queryKey: ["game-scores", gameId],
      queryFn: async () => {
        const response = await fetch(`/api/games/${gameId}/scores`);
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<GameScore>;
      },
      enabled: gameIds.length > 0,
    })),
  });

  const contestData = useMemo(() => {
    return contestDetailsQueries
      .map(query => (query.data ? formatContestData(query.data) : null))
      .filter((entry): entry is ContestQueryData => Boolean(entry));
  }, [contestDetailsQueries]);

  const gameDetailsMap = useMemo(() => {
    const map = new Map<number, GameDetails>();
    gameIds.forEach((gameId, index) => {
      const data = gameDetailsQueries[index]?.data;
      if (data) {
        map.set(gameId, data);
      }
    });
    return map;
  }, [gameDetailsQueries, gameIds]);

  const gameScoresMap = useMemo(() => {
    const map = new Map<number, GameScore>();
    gameIds.forEach((gameId, index) => {
      const data = gameScoresQueries[index]?.data;
      if (data) {
        map.set(gameId, data);
      }
    });
    return map;
  }, [gameScoresQueries, gameIds]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const userBoxes = useMemo(() => {
    if (!walletAddress || !ownerAddress) return [] as UserBoxEntry[];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return contestData
      .flatMap(({ contest, boxOwners }) => {
        const gameDetails = gameDetailsMap.get(contest.gameId);
        if (!gameDetails?.date) return [];

        const gameDate = new Date(gameDetails.date);
        if (Number.isNaN(gameDate.getTime())) return [];
        if (gameDate < twoWeeksAgo) return [];

        const gameScore = gameScoresMap.get(contest.gameId);
        const matchup = getMatchupLabel(gameScore, contest.gameId);
        const { homeLabel, awayLabel } = getTeamLabels(gameScore);

        return boxOwners
          .filter(box => box.owner.toLowerCase() === walletAddress)
          .map(box => ({
            contestId: contest.id,
            contestTitle: contest.title,
            gameId: contest.gameId,
            gameDate,
            boxPosition: box.tokenId % 100,
            tokenId: box.tokenId,
            boxRowDigit: contest.randomValuesSet
              ? contest.rows[Math.floor((box.tokenId % 100) / 10)]
              : undefined,
            boxColDigit: contest.randomValuesSet
              ? contest.cols[(box.tokenId % 100) % 10]
              : undefined,
            randomValuesSet: contest.randomValuesSet,
            homeTeamLabel: homeLabel,
            awayTeamLabel: awayLabel,
            matchup,
            ownerAddress,
          }));
      })
      .sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
  }, [contestData, gameDetailsMap, gameScoresMap, ownerAddress, walletAddress]);

  const winningBoxes = useMemo(() => {
    const entries: WinningBoxEntry[] = [];

    contestData.forEach(({ contest, boxOwners }) => {
      if (!contest.randomValuesSet) return;

      const gameScore = gameScoresMap.get(contest.gameId);
      const gameDetails = gameDetailsMap.get(contest.gameId);

      if (!gameScore || !gameDetails?.date) return;

      const gameDate = new Date(gameDetails.date);
      if (Number.isNaN(gameDate.getTime())) return;

      const payoutType = getPayoutStrategyType(contest.payoutStrategy);
      const netRewards = getNetRewards(contest.totalRewards);
        const matchup = getMatchupLabel(gameScore, contest.gameId);
        const { homeLabel, awayLabel } = getTeamLabels(gameScore);

      let quarterAmounts = {
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        scoreChange: 0,
      };

      if (payoutType === PayoutStrategyType.QUARTERS_ONLY) {
        const payouts = getQuartersOnlyPayouts(netRewards);
        quarterAmounts = {
          q1: payouts.q1.amount,
          q2: payouts.q2.amount,
          q3: payouts.q3.amount,
          q4: payouts.q4.amount,
          scoreChange: 0,
        };
      } else if (payoutType === PayoutStrategyType.SCORE_CHANGES) {
        const scoreChangeCount = gameScore.scoringPlays?.length || 0;
        const payouts = getScoreChangesPayouts(netRewards, scoreChangeCount);
        quarterAmounts = {
          q1: payouts.quarters.q1.amount,
          q2: payouts.quarters.q2.amount,
          q3: payouts.quarters.q3.amount,
          q4: payouts.quarters.q4.amount,
          scoreChange: payouts.scoreChanges.perScoreChange,
        };
      }

      const winsMap = new Map<number, WinningBoxEntry>();

      const addWin = (boxPosition: number | null, amount: number) => {
        if (boxPosition === null || amount <= 0) return;
        const tokenId = contest.id * 100 + boxPosition;
        const owner = boxOwners.find(box => box.tokenId === tokenId)?.owner;
        if (!owner || !isRealUser(owner)) return;

        const existing = winsMap.get(tokenId);
        if (existing) {
          existing.totalAmount += amount;
          return;
        }

        const rowIndex = Math.floor(boxPosition / 10);
        const colIndex = boxPosition % 10;
        winsMap.set(tokenId, {
          contestId: contest.id,
          contestTitle: contest.title,
          gameId: contest.gameId,
          gameDate,
          boxPosition,
          tokenId,
          boxRowDigit: contest.rows[rowIndex],
          boxColDigit: contest.cols[colIndex],
          homeTeamLabel: homeLabel,
          awayTeamLabel: awayLabel,
          owner,
          totalAmount: amount,
          currencyAddress: contest.boxCost.currency,
          matchup,
        });
      };

      if (gameScore.qComplete >= 1) {
        addWin(
          findBoxPosition(contest, gameScore.homeQ1LastDigit, gameScore.awayQ1LastDigit),
          quarterAmounts.q1,
        );
      }
      if (gameScore.qComplete >= 2) {
        addWin(
          findBoxPosition(contest, gameScore.homeQ2LastDigit, gameScore.awayQ2LastDigit),
          quarterAmounts.q2,
        );
      }
      if (gameScore.qComplete >= 3) {
        addWin(
          findBoxPosition(contest, gameScore.homeQ3LastDigit, gameScore.awayQ3LastDigit),
          quarterAmounts.q3,
        );
      }
      if (gameScore.qComplete >= 4) {
        addWin(
          findBoxPosition(contest, gameScore.homeFLastDigit, gameScore.awayFLastDigit),
          quarterAmounts.q4,
        );
      }

      if (
        payoutType === PayoutStrategyType.SCORE_CHANGES &&
        quarterAmounts.scoreChange > 0
      ) {
        gameScore.scoringPlays?.forEach(play => {
          const homeScore = play.homeScore ?? 0;
          const awayScore = play.awayScore ?? 0;
          addWin(
            findBoxPosition(contest, homeScore % 10, awayScore % 10),
            quarterAmounts.scoreChange,
          );
        });
      }

      winsMap.forEach(entry => entries.push(entry));
    });

    return entries.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
  }, [contestData, gameDetailsMap, gameScoresMap]);

  const [winningBoxesPage, setWinningBoxesPage] = useState(1);

  const totalWinningBoxPages = Math.max(
    1,
    Math.ceil(winningBoxes.length / WINNING_BOXES_PAGE_SIZE),
  );

  useEffect(() => {
    setWinningBoxesPage(currentPage =>
      Math.min(Math.max(currentPage, 1), totalWinningBoxPages),
    );
  }, [totalWinningBoxPages]);

  const paginatedWinningBoxes = useMemo(() => {
    const startIndex = (winningBoxesPage - 1) * WINNING_BOXES_PAGE_SIZE;
    return winningBoxes.slice(startIndex, startIndex + WINNING_BOXES_PAGE_SIZE);
  }, [winningBoxes, winningBoxesPage]);

  const showWinningBoxPagination =
    winningBoxes.length > WINNING_BOXES_PAGE_SIZE;

  const isLoading =
    contestsQuery.isLoading ||
    contestDetailsQueries.some(query => query.isLoading) ||
    gameDetailsQueries.some(query => query.isLoading) ||
    gameScoresQueries.some(query => query.isLoading);

  return (
    <section className="py-12 space-y-10">
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold">Your Recent & Upcoming Boxes</h2>
          <p className="text-muted-foreground">
            Track your boxes for games from the last two weeks or any upcoming matchups.
          </p>
        </div>

        {!walletAddress ? (
          <Card>
            <CardContent className="py-6 text-muted-foreground">
              Connect your wallet to see your boxes for recent and upcoming games.
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="py-6 text-muted-foreground">
              Loading your boxes...
            </CardContent>
          </Card>
        ) : userBoxes.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-muted-foreground">
              No boxes found for recent or upcoming games yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {userBoxes.map(box => (
              <Card key={`${box.contestId}-${box.tokenId}`}>
                <CardHeader>
                  <CardTitle className="text-base">{box.matchup}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Game start</span>
                    <span>{dateFormatter.format(box.gameDate)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Contest</span>
                    <Link
                      className="text-primary hover:underline"
                      href={`/contest/${box.contestId}`}
                    >
                      {box.contestTitle}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Box</span>
                    <Link
                      className="text-primary hover:underline"
                      href={{
                        pathname: `/contest/${box.contestId}`,
                        query: {
                          boxTokenId: box.tokenId,
                          owner: box.ownerAddress,
                        },
                      }}
                    >
                      #{box.boxPosition}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Box value</span>
                    <span>
                      {box.randomValuesSet ? (
                        <>
                          {box.awayTeamLabel} {box.boxColDigit} / {box.homeTeamLabel}{" "}
                          {box.boxRowDigit}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Random values pending
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Link
                      className="text-primary hover:underline text-xs"
                      href={{
                        pathname: `/contest/${box.contestId}`,
                        query: {
                          boxTokenId: box.tokenId,
                          owner: box.ownerAddress,
                        },
                      }}
                    >
                      View box
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold">Winning Boxes</h2>
          <p className="text-muted-foreground">
            Boxes that have already hit winning numbers and their total payout amounts.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-6 text-muted-foreground">
              Loading winning boxes...
            </CardContent>
          </Card>
        ) : winningBoxes.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-muted-foreground">
              No winning boxes recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedWinningBoxes.map(entry => (
              <Card key={`${entry.contestId}-${entry.tokenId}`}>
                <CardHeader>
                  <CardTitle className="text-base">{entry.matchup}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Game start</span>
                    <span>{dateFormatter.format(entry.gameDate)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Contest</span>
                    <Link
                      className="text-primary hover:underline"
                      href={`/contest/${entry.contestId}`}
                    >
                      {entry.contestTitle}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Box</span>
                    <Link
                      className="text-primary hover:underline"
                      href={{
                        pathname: `/contest/${entry.contestId}`,
                        query: {
                          boxTokenId: entry.tokenId,
                          owner: entry.owner,
                        },
                      }}
                    >
                      #{entry.boxPosition}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Box value</span>
                    <span>
                      {entry.awayTeamLabel} {entry.boxColDigit} /{" "}
                      {entry.homeTeamLabel} {entry.boxRowDigit}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Winner</span>
                    <BoxOwnerInfo address={entry.owner} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                    <span className="text-muted-foreground">Total won</span>
                    <PrizeAmount
                      amount={entry.totalAmount}
                      currencyAddress={entry.currencyAddress}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showWinningBoxPagination && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              disabled={winningBoxesPage <= 1}
              size="sm"
              variant="outline"
              onClick={() =>
                setWinningBoxesPage(currentPage => Math.max(1, currentPage - 1))
              }
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {winningBoxesPage} of {totalWinningBoxPages}
            </span>
            <Button
              disabled={winningBoxesPage >= totalWinningBoxPages}
              size="sm"
              variant="outline"
              onClick={() =>
                setWinningBoxesPage(currentPage =>
                  Math.min(totalWinningBoxPages, currentPage + 1),
                )
              }
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
