"use client";
import { useQuery } from "@tanstack/react-query";
import { useActiveAccount } from "thirdweb/react";

import { chain } from "@/constants";
import { usePickemContract } from "@/hooks/usePickemContract";

export function useOwnedPickemEntries() {
  const account = useActiveAccount();
  const { getUserNFTBalance, getUserNFTByIndex, getNFTPrediction } =
    usePickemContract();
  return useQuery({
    queryKey: ["ownedPickemEntries", chain.id, account?.address.toLowerCase()],
    enabled: Boolean(account),
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!account) return [];
      const count = Number(await getUserNFTBalance(account.address));
      return Promise.all(
        Array.from({ length: count }, async (_, index) => {
          const tokenId = await getUserNFTByIndex(account.address, index);
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
