"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ZERO_ADDRESS } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { shortenAddress } from "thirdweb/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chain, contests } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import {
  getNetRewards,
  getPayoutStrategyType,
  getQuartersOnlyPayouts,
  getScoreChangesPayouts,
} from "@/lib/payout-utils";

import { BoxOwner, Contest, GameScore, PayoutStrategyType } from "../contest/types";

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
  matchup: string;
}

interface WinningBoxEntry {
  contestId: number;
  contestTitle: string;
  gameId: number;
  gameDate: Date;
  boxPosition: number;
  tokenId: number;
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

export function HomeContestHighlights() {
  const account = useActiveAccount();
  const walletAddress = account?.address?.toLowerCase();

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
    if (!walletAddress) return [] as UserBoxEntry[];

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return contestData
      .flatMap(({ contest, boxOwners }) => {
        const gameDetails = gameDetailsMap.get(contest.gameId);
        if (!gameDetails?.date) return [];

        const gameDate = new Date(gameDetails.date);
        if (Number.isNaN(gameDate.getTime())) return [];
        if (gameDate < twoWeeksAgo) return [];

        const matchup = getMatchupLabel(
          gameScoresMap.get(contest.gameId),
          contest.gameId,
        );

        return boxOwners
          .filter(box => box.owner.toLowerCase() === walletAddress)
          .map(box => ({
            contestId: contest.id,
            contestTitle: contest.title,
            gameId: contest.gameId,
            gameDate,
            boxPosition: box.tokenId % 100,
            tokenId: box.tokenId,
            matchup,
          }));
      })
      .sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
  }, [contestData, gameDetailsMap, gameScoresMap, walletAddress]);

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

        winsMap.set(tokenId, {
          contestId: contest.id,
          contestTitle: contest.title,
          gameId: contest.gameId,
          gameDate,
          boxPosition,
          tokenId,
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
                    <span>#{box.boxPosition}</span>
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
            {winningBoxes.map(entry => (
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
                    <span>#{entry.boxPosition}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Winner</span>
                    <span>{shortenAddress(entry.owner)}</span>
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
      </div>
    </section>
  );
}
