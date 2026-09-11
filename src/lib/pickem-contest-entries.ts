import { type Address, parseAbi } from "viem";

import { chain, pickemNFT } from "@/constants";
import { abi } from "@/constants/abis/pickem";
import { address as pickemAddress, rpc } from "@/lib/bankr/service";

const ownerOfAbi = parseAbi([
  "function ownerOf(uint256) view returns (address)",
]);

export interface ContestEntrySnapshot {
  tokenId: number;
  /** Current holder, lowercased. */
  owner: string;
  /** In the contest's gameIds order (getUserPicks returns them that way). */
  picks: number[];
  tiebreakerPoints: number;
  /** Onchain score; only meaningful once the entry's score is calculated. */
  correctPicks: number;
}

/**
 * Every entry in a contest — owner, picks, tiebreaker — in three multicalls,
 * instead of three reads per entry.
 */
export async function contestEntrySnapshots(
  gameIds: readonly bigint[],
  tokenIds: readonly bigint[],
): Promise<ContestEntrySnapshot[]> {
  if (tokenIds.length === 0) return [];
  const [predictions, picks, owners] = await Promise.all([
    rpc.multicall({
      allowFailure: false,
      contracts: tokenIds.map(tokenId => ({
        address: pickemAddress,
        abi,
        functionName: "getUserPrediction" as const,
        args: [tokenId] as const,
      })),
    }),
    rpc.multicall({
      allowFailure: false,
      contracts: tokenIds.map(tokenId => ({
        address: pickemAddress,
        abi,
        functionName: "getUserPicks" as const,
        args: [tokenId, gameIds] as const,
      })),
    }),
    rpc.multicall({
      allowFailure: false,
      contracts: tokenIds.map(tokenId => ({
        address: pickemNFT[chain.id] as Address,
        abi: ownerOfAbi,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      })),
    }),
  ]);
  return tokenIds.map((tokenId, i) => ({
    tokenId: Number(tokenId),
    owner: owners[i].toLowerCase(),
    picks: picks[i].map(Number),
    tiebreakerPoints: Number(predictions[i][3]),
    correctPicks: Number(predictions[i][4]),
  }));
}
