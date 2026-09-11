"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";

import { useCurrentNFLWeek } from "@/hooks/useCurrentNFLWeek";
import { useOwnedPickemEntries } from "@/hooks/useOwnedPickemEntries";
import { usePickemContract } from "@/hooks/usePickemContract";
import { calculateEntryPrize } from "@/lib/pickem-prize";
import {
  formatPlace,
  getPickResult,
  type PickResult,
  rankEntries,
  selectCurrentWeekContests,
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
  completed?: boolean;
  displayClock?: string;
  period?: number;
  shortDetail?: string;
  pick: number;
  result: PickResult;
  /** Other wallets in the contest that picked each side (deduped, viewer excluded). */
  awayPickers: string[];
  homePickers: string[];
}

export interface CurrentWeekPickemEntry {
  contestId: number;
  tokenId: number;
  weekNumber: number;
  seasonType: number;
  year: number;
  totalEntries: number;
  gamesFinalized: boolean;
  currency: string;
  entryFee: bigint;
  prizeWon: bigint;
  claimed: boolean;
  payoutComplete: boolean;
  payoutDeadline: number;
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
  completed?: boolean;
  displayClock?: string;
  period?: number;
  shortDetail?: string;
}

interface UseMyCurrentWeekPicksReturn {
  isConnected: boolean;
  isLoading: boolean;
  currentWeek: ReturnType<typeof useCurrentNFLWeek>["currentWeek"];
  entries: CurrentWeekPickemEntry[];
  error: Error | null;
  refetch: () => void;
}

export function useMyCurrentWeekPicks(
  scope: "current" | "all" | number = "current",
  /** Whose entries to load. Defaults to the connected wallet. */
  ownerAddress?: string,
): UseMyCurrentWeekPicksReturn {
  const account = useActiveAccount();
  const owner = ownerAddress ?? account?.address;
  const {
    currentWeek,
    isLoading: isWeekLoading,
    error: weekError,
  } = useCurrentNFLWeek();
  const owned = useOwnedPickemEntries(owner);
  const {
    getPayoutRules,
    getContestWinners,
    getContest,

    getContestTokenIds,
    getUserPicks,
    getNFTPrediction,
    getNFTOwner,
  } = usePickemContract();

  const weekKey = currentWeek
    ? `${currentWeek.seasonYear}-${currentWeek.seasonType}-${currentWeek.week}`
    : undefined;

  const query = useQuery({
    queryKey: [
      ...queryKeys.myCurrentWeekPicks(owner, weekKey),
      scope,
      owned.data,
    ],
    enabled: Boolean(
      owner && owned.data && (scope !== "current" || currentWeek),
    ),
    // Someone else's profile doesn't need live polling.
    staleTime: ownerAddress ? 5 * 60 * 1000 : 30 * 1000,
    refetchInterval: ownerAddress ? false : 30 * 1000,
    queryFn: async (): Promise<CurrentWeekPickemEntry[]> => {
      if (!owner || !owned.data || (scope === "current" && !currentWeek))
        return [];

      const contestIds = [...new Set(owned.data.map(entry => entry.contestId))];
      const contests = await Promise.all(
        contestIds.map(async contestId => {
          const contest = await getContest(contestId);
          return {
            contestId,
            contest,
            year: Number(contest.year),
            seasonType: Number(contest.seasonType),
            weekNumber: Number(contest.weekNumber),
          };
        }),
      );
      const matchingContests =
        typeof scope === "number"
          ? contests.filter(c => c.contestId === scope)
          : scope === "all"
            ? contests
            : selectCurrentWeekContests(contests, currentWeek!);
      const payoutRules = await getPayoutRules();

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
          const tokenIds = owned.data
            .filter(entry => entry.contestId === contestId)
            .map(entry => entry.tokenId);
          if (tokenIds.length === 0) return [];

          const gameIds = contest.gameIds.map(id => id.toString());
          const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

          const [games, contestTokenIds, winners] = await Promise.all([
            loadWeekGames(
              Number(contest.year),
              Number(contest.seasonType),
              Number(contest.weekNumber),
            ),
            getContestTokenIds(contestId),
            getContestWinners(contestId),
          ]);

          const contestEntries = await Promise.all(
            contestTokenIds.map(async tokenId => {
              const [picks, prediction, owner] = await Promise.all([
                getUserPicks(tokenId, gameIdsBigInt),
                getNFTPrediction(tokenId),
                getNFTOwner(tokenId),
              ]);
              return {
                tokenId,
                owner: owner.toLowerCase(),
                picks: picks.map(pick => Number(pick)),
                tiebreakerPoints: Number(prediction[3]),
                claimed: Boolean(prediction[5]),
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

          // getUserPicks returns picks in the order of gameIds, so index i is
          // gameIds[i]. Dedupe by wallet and leave out the owner's own wallet.
          const viewer = owner.toLowerCase();
          const pickersByGameId = new Map(
            gameIds.map((gameId, index) => {
              const away = new Set<string>();
              const home = new Set<string>();
              for (const entry of contestEntries) {
                if (entry.owner === viewer) continue;
                if (entry.picks[index] === 0) away.add(entry.owner);
                if (entry.picks[index] === 1) home.add(entry.owner);
              }
              return [gameId, { away: [...away], home: [...home] }];
            }),
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
                const pickers = pickersByGameId.get(gameId);
                const awayPickers = pickers?.away ?? [];
                const homePickers = pickers?.home ?? [];
                if (!game) {
                  return {
                    gameId,
                    homeTeam: "Home",
                    awayTeam: "Away",
                    kickoff: "",
                    pick,
                    result: "pending" as const,
                    awayPickers,
                    homePickers,
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
                  completed: game.completed,
                  displayClock: game.displayClock,
                  period: game.period,
                  shortDetail: game.shortDetail,
                  pick,
                  result: getPickResult(game, pick),
                  awayPickers,
                  homePickers,
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
              currency: contest.currency,
              entryFee: contest.entryFee,
              payoutComplete: contest.payoutComplete,
              payoutDeadline: Number(contest.payoutDeadline) * 1000,
              claimed: userEntry?.claimed ?? false,
              prizeWon: calculateEntryPrize(
                contest.totalPrizePool,
                payoutRules.fee,
                payoutRules.denominator,
                contest.payoutStructure.payoutPercentages,
                winners.findIndex(id => Number(id) === tokenId),
              ),
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

      return entries
        .flat()
        .sort(
          (a, b) =>
            b.year - a.year ||
            b.seasonType - a.seasonType ||
            b.weekNumber - a.weekNumber ||
            b.contestId - a.contestId,
        );
    },
  });

  return {
    isConnected: Boolean(account?.address),
    isLoading:
      Boolean(owner) &&
      ((scope === "current" && isWeekLoading) ||
        owned.isLoading ||
        query.isLoading),
    currentWeek,
    entries: query.data ?? [],
    error: (owned.error ||
      query.error ||
      (scope === "current" ? weekError : null)) as Error | null,
    refetch: () => {
      void owned.refetch();
      void query.refetch();
    },
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
