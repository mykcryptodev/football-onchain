"use client";
import { useQuery } from "@tanstack/react-query";
import { getContract, readContract } from "thirdweb";

import { boxes, chain } from "@/constants";
import { client } from "@/providers/Thirdweb";

const boxesContract = getContract({
  client,
  chain,
  address: boxes[chain.id],
});

/** Squares box token IDs currently held by `owner`, grouped by contest. */
export function useOwnedBoxes(owner: string) {
  return useQuery({
    queryKey: ["ownedBoxes", chain.id, owner.toLowerCase()],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const count = Number(
        await readContract({
          contract: boxesContract,
          method: "function balanceOf(address owner) view returns (uint256)",
          params: [owner],
        }),
      );
      const tokenIds = await Promise.all(
        Array.from({ length: count }, async (_, index) =>
          Number(
            await readContract({
              contract: boxesContract,
              method:
                "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
              params: [owner, BigInt(index)],
            }),
          ),
        ),
      );
      // Box token IDs are contestId * 100 + position (Contests.sol).
      const byContest = new Map<number, number[]>();
      for (const tokenId of tokenIds) {
        const contestId = Math.floor(tokenId / 100);
        byContest.set(contestId, [
          ...(byContest.get(contestId) ?? []),
          tokenId,
        ]);
      }
      return [...byContest.entries()]
        .map(([contestId, boxTokenIds]) => ({ contestId, boxTokenIds }))
        .sort((a, b) => b.contestId - a.contestId);
    },
  });
}
