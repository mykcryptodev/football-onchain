"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";

import { useCurrentNFLWeek } from "@/hooks/useCurrentNFLWeek";
import { usePickemContract } from "@/hooks/usePickemContract";
import {
  formatPlace,
  getPickResult,
  type PickResult,
  rankEntries,
} from "@/lib/pickem-scoring";
import { queryKeys } from "@/lib/query-keys";

export interface CurrentWeekGamePick {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeLogo?: string;
  awayLogo?: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  pick: number;
  result: PickResult;
}

export interface CurrentWeekPickemEntry {
  contestId: number;
  tokenId: number;
  weekNumber: number;
  seasonType: number;
  year: number;
  totalEntries: number;
  gamesFinalized: boolean;
  rank: number | null;
  placeLabel: string;
  correctPicks: number;
  scoredGames: number;
  totalGames: number;
  tiebreakerPoints: number;
  games: CurrentWeekGamePick[];
}

interface WeekGameApi {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string;
  homeLogo?: string;
  awayLogo?: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
}

interface UseMyCurrentWeekPicksReturn {
  isConnected: boolean;
  isLoading: boolean;
  currentWeek: ReturnType<typeof useCurrentNFLWeek>["currentWeek"];
  entries: CurrentWeekPickemEntry[];
  error: Error | null;
}

export function useMyCurrentWeekPicks(): UseMyCurrentWeekPicksReturn {
  const account = useActiveAccount();
  const { currentWeek, isLoading: isWeekLoading } = useCurrentNFLWeek();
  const {
    getUserContests,
    getContest,
    getUserTokens,
    getContestTokenIds,
    getUserPicks,
    getNFTPrediction,
  } = usePickemContract();

  const weekKey = currentWeek
    ? `${currentWeek.seasonYear}-${currentWeek.seasonType}-${currentWeek.week}`
    : undefined;

  const query = useQuery({
    queryKey: queryKeys.myCurrentWeekPicks(account?.address, weekKey),
    enabled: Boolean(account?.address && currentWeek),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async (): Promise<CurrentWeekPickemEntry[]> => {
      if (!account?.address || !currentWeek) return [];

      const contestIds = [
        ...new Set(
          (await getUserContests(account.address)).map(id => Number(id)),
        ),
      ];

      const contests = (
        await Promise.all(
          contestIds.map(async contestId => {
            try {
              const contest = await getContest(contestId);
              return { contestId, contest };
            } catch (error) {
              console.error(
                `Error fetching pickem contest ${contestId}:`,
                error,
              );
              return null;
            }
          }),
        )
      ).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      const currentWeekContests = contests.filter(({ contest }) => {
        return (
          Number(contest.year) === currentWeek.seasonYear &&
          Number(contest.seasonType) === currentWeek.seasonType &&
          Number(contest.weekNumber) === currentWeek.week
        );
      });

      const matchingContests =
        currentWeekContests.length > 0
          ? currentWeekContests
          : contests.filter(({ contest }) => {
              return (
                Number(contest.year) === currentWeek.seasonYear &&
                Number(contest.seasonType) === currentWeek.seasonType &&
                Number(contest.weekNumber) === currentWeek.week - 1
              );
            });

      const weekGamesCache = new Map<string, Promise<WeekGameApi[]>>();
      const loadWeekGames = (
        year: number,
        seasonType: number,
        weekNumber: number,
      ) => {
        const key = `${year}-${seasonType}-${weekNumber}`;
        const cached = weekGamesCache.get(key);
        if (cached) return cached;
        const request = fetchWeekGames(year, seasonType, weekNumber);
        weekGamesCache.set(key, request);
        return request;
      };

      const entries = await Promise.all(
        matchingContests.map(async ({ contestId, contest }) => {
          const tokenIds = (
            await getUserTokens(contestId, account.address)
          ).map(id => Number(id));
          if (tokenIds.length === 0) return [];

          const gameIds = contest.gameIds.map(id => id.toString());
          const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

          const [games, contestTokenIds] = await Promise.all([
            loadWeekGames(
              Number(contest.year),
              Number(contest.seasonType),
              Number(contest.weekNumber),
            ),
            getContestTokenIds(contestId),
          ]);

          const contestEntries = await Promise.all(
            contestTokenIds.map(async tokenId => {
              const [picks, prediction] = await Promise.all([
                getUserPicks(tokenId, gameIdsBigInt),
                getNFTPrediction(tokenId),
              ]);
              return {
                tokenId,
                picks: picks.map(pick => Number(pick)),
                tiebreakerPoints: Number(prediction[3]),
              };
            }),
          );

          const ranked = rankEntries(
            contestEntries,
            gameIds,
            games,
            contest.tiebreakerGameId.toString(),
          );
          const rankByToken = new Map(
            ranked.map(entry => [entry.tokenId, entry]),
          );

          return tokenIds.map(tokenId => {
            const userEntry = contestEntries.find(
              entry => entry.tokenId === tokenId,
            );
            const rankedEntry = rankByToken.get(tokenId);
            const pickByGameId = new Map(
              gameIds.map((gameId, index) => [
                gameId,
                userEntry?.picks[index] ?? -1,
              ]),
            );

            const gamesById = new Map(games.map(game => [game.gameId, game]));
            const gamePicks: CurrentWeekGamePick[] = gameIds
              .map(gameId => {
                const game = gamesById.get(gameId);
                const pick = pickByGameId.get(gameId) ?? -1;
                if (!game) {
                  return {
                    gameId,
                    homeTeam: "Home",
                    awayTeam: "Away",
                    kickoff: "",
                    pick,
                    result: "pending" as const,
                  };
                }
                return {
                  gameId: game.gameId,
                  homeTeam: game.homeTeam,
                  awayTeam: game.awayTeam,
                  homeAbbreviation: game.homeAbbreviation,
                  awayAbbreviation: game.awayAbbreviation,
                  homeLogo: game.homeLogo,
                  awayLogo: game.awayLogo,
                  kickoff: game.kickoff,
                  homeScore: game.homeScore,
                  awayScore: game.awayScore,
                  status: game.status,
                  pick,
                  result: getPickResult(game, pick),
                };
              })
              .sort((a, b) => {
                const aTime = a.kickoff ? new Date(a.kickoff).getTime() : 0;
                const bTime = b.kickoff ? new Date(b.kickoff).getTime() : 0;
                return aTime - bTime;
              });

            const scoredGames = rankedEntry?.scoredGames ?? 0;

            return {
              contestId,
              tokenId,
              weekNumber: Number(contest.weekNumber),
              seasonType: Number(contest.seasonType),
              year: Number(contest.year),
              totalEntries: Number(contest.totalEntries),
              gamesFinalized: contest.gamesFinalized,
              rank: scoredGames > 0 ? (rankedEntry?.rank ?? null) : null,
              placeLabel:
                scoredGames > 0 && rankedEntry
                  ? `${formatPlace(rankedEntry.rank)} of ${contest.totalEntries}`
                  : `${contest.totalEntries} ${Number(contest.totalEntries) === 1 ? "entry" : "entries"}`,
              correctPicks: rankedEntry?.correctPicks ?? 0,
              scoredGames,
              totalGames: gameIds.length,
              tiebreakerPoints: userEntry?.tiebreakerPoints ?? 0,
              games: gamePicks,
            } satisfies CurrentWeekPickemEntry;
          });
        }),
      );

      return entries.flat().sort((a, b) => a.contestId - b.contestId);
    },
  });

  return {
    isConnected: Boolean(account?.address),
    isLoading: isWeekLoading || query.isLoading,
    currentWeek,
    entries: query.data ?? [],
    error: query.error as Error | null,
  };
}

async function fetchWeekGames(
  year: number,
  seasonType: number,
  weekNumber: number,
): Promise<WeekGameApi[]> {
  const response = await fetch(
    `/api/week-games?year=${year}&seasonType=${seasonType}&week=${weekNumber}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch week games");
  }
  return response.json() as Promise<WeekGameApi[]>;
}
