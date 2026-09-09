/**
 * Server-side assembly of a Pick'em contest leaderboard.
 *
 * This exists so the board can be computed once and cached, instead of every
 * viewer's browser re-reading the same contract state. The UI used to do all
 * of this client-side, which meant N viewers cost N full read sets and there
 * was no server hop for a cache to live in.
 *
 * Scoring inputs are deliberately the same ESPN weekly scoreboard the client
 * used (`@/lib/week-games`), not the per-game `matchups()` cache: the scoring
 * helpers need each game's `status` to tell an in-progress game from a
 * scheduled one, and `matchups()` does not carry it.
 *
 * Note there is a second, older leaderboard in `@/lib/bankr/service.ts` built
 * for the Bankr agent. It has a different response shape and a different
 * consumer, so it is left alone here; the two can drift.
 */
import { type Address, zeroAddress } from "viem";

import { chain, pickem } from "@/constants";
import { abi } from "@/constants/abis/pickem";
import { abi as nftAbi } from "@/constants/abis/pickemNFT";
import { rpc } from "@/lib/bankr/service";
import { calculateEntryPrize } from "@/lib/pickem-prize";
import { rankEntries } from "@/lib/pickem-scoring";
import { fetchWeekGames } from "@/lib/week-games";

const address = pickem[chain.id] as Address;

/**
 * Matches `leaderboard()` in bankr/service.ts, which chunks its entry reads at
 * 50 and refuses contests above 5000. Each `getUserPicks` call carries the
 * contest's whole gameIds array, so an unchunked aggregate grows calldata
 * linearly with entry count.
 */
const ENTRY_CHUNK = 50;
const MAX_ENTRIES = 5000;

/** bigints are serialized as decimal strings; JSON cannot carry them. */
export interface LeaderboardEntryDto {
  tokenId: number;
  address: string;
  originalPredictor: string;
  correctPicks: number;
  totalGames: number;
  tiebreakerPoints: number;
  submissionTime: number;
  rank: number;
  prize: string;
}

export interface LeaderboardDto {
  entries: LeaderboardEntryDto[];
  prizePool: string;
  currency: string;
  payoutPercentages: string[];
  /** Drives the cache TTL and lets a caller see how provisional this is. */
  gamesCompleted: number;
  totalGames: number;
  /** True once the contract has winners, i.e. prizes are no longer provisional. */
  settled: boolean;
}

export async function buildLeaderboard(
  contestId: bigint,
): Promise<LeaderboardDto> {
  // One aggregate call for everything that needs nothing but the contest id.
  const [contest, tokenIds, winners, fee, denominator, nft] =
    await rpc.multicall({
      allowFailure: false,
      contracts: [
        { address, abi, functionName: "getContest", args: [contestId] },
        { address, abi, functionName: "getContestTokenIds", args: [contestId] },
        { address, abi, functionName: "getContestWinners", args: [contestId] },
        { address, abi, functionName: "TREASURY_FEE" },
        { address, abi, functionName: "PERCENT_DENOMINATOR" },
        { address, abi, functionName: "pickemNFT" },
      ],
    });

  if (contest.creator === zeroAddress || contest.gameIds.length === 0)
    throw new Error("Contest not found.");
  if (tokenIds.length > MAX_ENTRIES)
    throw new Error("Contest too large for a single leaderboard response.");

  const payoutPercentages = contest.payoutStructure.payoutPercentages ?? [];
  const meta = {
    prizePool: contest.totalPrizePool.toString(),
    currency: contest.currency,
    payoutPercentages: payoutPercentages.map(p => p.toString()),
    settled: winners.length > 0,
  };

  const games = await fetchWeekGames(
    Number(contest.year),
    Number(contest.seasonType),
    Number(contest.weekNumber),
  );
  const gameIds = contest.gameIds.map(id => id.toString());
  const gamesCompleted = gameIds.filter(id =>
    games.some(g => g.gameId === id && g.completed),
  ).length;
  const counts = { gamesCompleted, totalGames: gameIds.length };

  if (tokenIds.length === 0) return { ...meta, ...counts, entries: [] };

  const raw: {
    tokenId: number;
    address: string;
    originalPredictor: string;
    submissionTime: number;
    tiebreakerPoints: number;
    picks: number[];
  }[] = [];

  for (let i = 0; i < tokenIds.length; i += ENTRY_CHUNK) {
    const chunk = tokenIds.slice(i, i + ENTRY_CHUNK);
    // allowFailure covers the one revert that is legitimate: `ownerOf` on a
    // burned token. A failed prediction/picks read is never legitimate for a
    // token that `getContestTokenIds` just returned — it means the RPC hiccuped
    // — and is thrown below rather than skipped, because silently dropping a
    // row would publish (and cache) a board with someone's entry missing.
    const results = await rpc.multicall({
      allowFailure: true,
      contracts: chunk.flatMap(tokenId => [
        {
          address: nft,
          abi: nftAbi,
          functionName: "ownerOf",
          args: [tokenId],
        } as const,
        {
          address,
          abi,
          functionName: "getUserPrediction",
          args: [tokenId],
        } as const,
        {
          address,
          abi,
          functionName: "getUserPicks",
          args: [tokenId, contest.gameIds],
        } as const,
      ]),
    });

    chunk.forEach((tokenId, index) => {
      const owner = results[index * 3];
      const prediction = results[index * 3 + 1];
      const picks = results[index * 3 + 2];
      if (prediction.status !== "success" || picks.status !== "success")
        throw new Error(
          `Leaderboard read failed for entry ${tokenId}; refusing to publish a partial board.`,
        );

      const predictor = prediction.result[1] as string;
      raw.push({
        tokenId: Number(tokenId),
        address:
          nft !== zeroAddress && owner.status === "success"
            ? (owner.result as string)
            : predictor,
        originalPredictor: predictor,
        submissionTime: Number(prediction.result[2]) * 1000,
        tiebreakerPoints: Number(prediction.result[3]),
        picks: (picks.result as readonly bigint[]).map(Number),
      });
    });
  }

  // Ranked from live/final ESPN results, since the on-chain leaderboard and
  // winners stay empty until scoring runs.
  const ranked = rankEntries(
    raw.map(e => ({
      tokenId: e.tokenId,
      picks: e.picks,
      tiebreakerPoints: e.tiebreakerPoints,
    })),
    gameIds,
    games,
    contest.tiebreakerGameId.toString(),
  );
  const rankByToken = new Map(ranked.map(entry => [entry.tokenId, entry]));

  const entries = raw
    .map(entry => {
      const rankedEntry = rankByToken.get(entry.tokenId);
      const winnerIndex = winners.findIndex(id => Number(id) === entry.tokenId);
      return {
        tokenId: entry.tokenId,
        address: entry.address,
        originalPredictor: entry.originalPredictor,
        correctPicks: rankedEntry?.correctPicks ?? 0,
        totalGames: gameIds.length,
        tiebreakerPoints: entry.tiebreakerPoints,
        submissionTime: entry.submissionTime,
        rank: rankedEntry?.rank ?? 0,
        prize: calculateEntryPrize(
          contest.totalPrizePool,
          fee,
          denominator,
          payoutPercentages,
          winnerIndex,
        ).toString(),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  return { ...meta, ...counts, entries };
}
