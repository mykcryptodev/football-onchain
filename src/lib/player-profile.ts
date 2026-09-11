import { type Address, parseAbi } from "viem";

import { boxes, chain, pickemNFT } from "@/constants";
import { abi } from "@/constants/abis/pickem";
import {
  address as pickemAddress,
  contest,
  matchups,
  rpc,
  tokenIds,
} from "@/lib/bankr/service";
import { calculateEntryPrize } from "@/lib/pickem-prize";
import { formatPlace, rankEntries } from "@/lib/pickem-scoring";
import { redis, safeRedisOperation } from "@/lib/redis";

const erc721Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
]);

// Profiles depend on what a wallet holds, which can change with any transfer.
const PROFILE_TTL_SECONDS = 60;
// A contest that's still being played or scored changes as games finish.
const LIVE_CONTEST_TTL_SECONDS = 60;

export interface ProfilePickemEntry {
  contestId: number;
  tokenId: number;
  year: number;
  seasonType: number;
  weekNumber: number;
  currency: string;
  /** Token base units, as a decimal string. */
  entryFee: string;
  prizeWon: string;
  gamesFinalized: boolean;
  placeLabel: string;
  correctPicks: number;
  scoredGames: number;
  totalGames: number;
}

export interface PlayerProfileData {
  pickem: ProfilePickemEntry[];
  squares: { contestId: number; boxCount: number }[];
}

type ContestSummary = Omit<
  ProfilePickemEntry,
  "tokenId" | "placeLabel" | "correctPicks" | "scoredGames" | "prizeWon"
> & {
  totalEntries: number;
  entries: Record<
    string,
    {
      rank: number | null;
      correctPicks: number;
      scoredGames: number;
      prizeWon: string;
    }
  >;
};

/**
 * A contest's results are final once its games are finalized and every entry
 * has been scored onchain: the contract leaderboard (and so every prize) is
 * built up as each score is calculated, and nothing changes after that.
 */
export function isContestSettled(
  gamesFinalized: boolean,
  scoreCalculated: readonly boolean[],
) {
  return gamesFinalized && scoreCalculated.every(Boolean);
}

async function cached<T>(
  key: string,
  load: () => Promise<{ value: T; ttl: number | null }>,
) {
  const hit = await safeRedisOperation(() => redis!.get<T>(key));
  if (hit) return hit;
  const { value, ttl } = await load();
  await safeRedisOperation(() =>
    ttl === null ? redis!.set(key, value) : redis!.set(key, value, { ex: ttl }),
  );
  return value;
}

async function heldTokenIds(nft: Address, owner: Address) {
  const count = await rpc.readContract({
    address: nft,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: [owner],
  });
  if (count === 0n) return [];
  return rpc.multicall({
    allowFailure: false,
    contracts: Array.from({ length: Number(count) }, (_, index) => ({
      address: nft,
      abi: erc721Abi,
      functionName: "tokenOfOwnerByIndex" as const,
      args: [owner, BigInt(index)] as const,
    })),
  });
}

/**
 * Every entry's rank and prize in one contest. Shared by every profile that
 * holds an entry in it, and cached forever once the contest is settled.
 */
function pickemContestSummary(contestId: bigint) {
  return cached<ContestSummary>(
    `profile:pickem-contest:v1:${chain.id}:${contestId}`,
    async () => {
      const c = await contest(contestId);
      const ids = await tokenIds(contestId);
      const [games, winners, fee, denominator, predictions, picks] =
        await Promise.all([
          // ESPN being down shouldn't break the profile; the contest just
          // won't be cached as settled until games load.
          matchups(c).catch(() => null),
          rpc.readContract({
            address: pickemAddress,
            abi,
            functionName: "getContestWinners",
            args: [contestId],
          }),
          rpc.readContract({
            address: pickemAddress,
            abi,
            functionName: "TREASURY_FEE",
          }),
          rpc.readContract({
            address: pickemAddress,
            abi,
            functionName: "PERCENT_DENOMINATOR",
          }),
          rpc.multicall({
            allowFailure: false,
            contracts: ids.map(tokenId => ({
              address: pickemAddress,
              abi,
              functionName: "getUserPrediction" as const,
              args: [tokenId] as const,
            })),
          }),
          rpc.multicall({
            allowFailure: false,
            contracts: ids.map(tokenId => ({
              address: pickemAddress,
              abi,
              functionName: "getUserPicks" as const,
              args: [tokenId, c.gameIds] as const,
            })),
          }),
        ]);

      const gameIds = c.gameIds.map(id => id.toString());
      const ranked = rankEntries(
        ids.map((tokenId, i) => ({
          tokenId: Number(tokenId),
          picks: picks[i].map(Number),
          tiebreakerPoints: Number(predictions[i][3]),
        })),
        gameIds,
        games ?? [],
        c.tiebreakerGameId.toString(),
      );
      const rankByToken = new Map(ranked.map(r => [r.tokenId, r]));

      const entries: ContestSummary["entries"] = {};
      for (const tokenId of ids) {
        const r = rankByToken.get(Number(tokenId));
        const scoredGames = r?.scoredGames ?? 0;
        entries[tokenId.toString()] = {
          rank: scoredGames > 0 ? (r?.rank ?? null) : null,
          correctPicks: r?.correctPicks ?? 0,
          scoredGames,
          prizeWon: calculateEntryPrize(
            c.totalPrizePool,
            fee,
            denominator,
            c.payoutStructure.payoutPercentages,
            winners.findIndex(id => id === tokenId),
          ).toString(),
        };
      }

      const settled =
        games !== null &&
        isContestSettled(
          c.gamesFinalized,
          predictions.map(p => p[5]),
        );
      return {
        value: {
          contestId: Number(contestId),
          year: Number(c.year),
          seasonType: Number(c.seasonType),
          weekNumber: Number(c.weekNumber),
          currency: c.currency,
          entryFee: c.entryFee.toString(),
          gamesFinalized: c.gamesFinalized,
          totalGames: gameIds.length,
          totalEntries: Number(c.totalEntries),
          entries,
        },
        ttl: settled ? null : LIVE_CONTEST_TTL_SECONDS,
      };
    },
  );
}

/** Pick'em entries and squares boxes a wallet currently holds. */
export function playerProfile(owner: Address) {
  return cached<PlayerProfileData>(
    `profile:player:v1:${chain.id}:${owner.toLowerCase()}`,
    async () => {
      const [entryIds, boxIds] = await Promise.all([
        heldTokenIds(pickemNFT[chain.id] as Address, owner),
        heldTokenIds(boxes[chain.id] as Address, owner),
      ]);

      const entryContests = entryIds.length
        ? await rpc.multicall({
            allowFailure: false,
            contracts: entryIds.map(tokenId => ({
              address: pickemAddress,
              abi,
              functionName: "getUserPrediction" as const,
              args: [tokenId] as const,
            })),
          })
        : [];
      const contestIds = [...new Set(entryContests.map(p => p[0]))];
      const summaries = new Map(
        (await Promise.all(contestIds.map(pickemContestSummary))).map(s => [
          s.contestId,
          s,
        ]),
      );

      const pickem = entryIds
        .map((tokenId, i) => {
          const {
            entries: contestEntries,
            totalEntries,
            ...contestFields
          } = summaries.get(Number(entryContests[i][0]))!;
          const e = contestEntries[tokenId.toString()];
          return {
            ...contestFields,
            tokenId: Number(tokenId),
            correctPicks: e?.correctPicks ?? 0,
            scoredGames: e?.scoredGames ?? 0,
            prizeWon: e?.prizeWon ?? "0",
            placeLabel: e?.rank
              ? `${formatPlace(e.rank)} of ${totalEntries}`
              : `${totalEntries} ${totalEntries === 1 ? "entry" : "entries"}`,
          } satisfies ProfilePickemEntry;
        })
        .sort(
          (a, b) =>
            b.year - a.year ||
            b.seasonType - a.seasonType ||
            b.weekNumber - a.weekNumber ||
            b.contestId - a.contestId,
        );

      // Box token IDs are contestId * 100 + position (Contests.sol).
      const boxCounts = new Map<number, number>();
      for (const tokenId of boxIds) {
        const contestId = Number(tokenId / 100n);
        boxCounts.set(contestId, (boxCounts.get(contestId) ?? 0) + 1);
      }
      const squares = [...boxCounts.entries()]
        .map(([contestId, boxCount]) => ({ contestId, boxCount }))
        .sort((a, b) => b.contestId - a.contestId);

      return { value: { pickem, squares }, ttl: PROFILE_TTL_SECONDS };
    },
  );
}
