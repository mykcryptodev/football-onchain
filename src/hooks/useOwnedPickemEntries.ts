"use client";
import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";

import { chain } from "@/constants";
import { usePickemContract } from "@/hooks/usePickemContract";

/** Pick'em entry NFTs currently held by `ownerAddress` (defaults to the connected wallet). */
export function useOwnedPickemEntries(ownerAddress?: string) {
  const account = useActiveAccount();
  const owner = ownerAddress ?? account?.address;
  const { getUserNFTBalance, getUserNFTByIndex, getNFTPrediction } =
    usePickemContract();
  return useQuery({
    queryKey: ["ownedPickemEntries", chain.id, owner?.toLowerCase()],
    enabled: Boolean(owner),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!owner) return [];
      const count = Number(await getUserNFTBalance(owner));
      return Promise.all(
        Array.from({ length: count }, async (_, index) => {
          const tokenId = await getUserNFTByIndex(owner, index);
          const prediction = await getNFTPrediction(tokenId);
          return {
            tokenId,
            contestId: Number(prediction[0]),
            claimed: Boolean(prediction[5]),
          };
        }),
      );
    },
  });
}
