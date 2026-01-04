"use client";

import { useQuery } from "@tanstack/react-query";
import { getContract, ZERO_ADDRESS } from "thirdweb";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { erc20Abi } from "viem";

import { chain } from "@/constants";
import { client } from "@/providers/Thirdweb";

type TokenInfo = {
  address: string;
  symbol: string;
  chainId: number;
};

type UseTokenInfoResult = {
  tokenInfo: TokenInfo | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Hook to fetch token metadata (symbol, decimals, etc.) for a given token address.
 * Handles both native ETH and ERC20 tokens.
 * Uses React Query for caching and automatic refetching.
 */
export function useTokenInfo(tokenAddress: string): UseTokenInfoResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tokens", "metadata", tokenAddress],
    queryFn: async () => {
      const isNative =
        tokenAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase();

      if (isNative) {
        return {
          address: ZERO_ADDRESS,
          symbol: "ETH",
          chainId: chain.id,
        };
      }

      const contract = getContract({
        client,
        chain,
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
      });

      const metadata = await getCurrencyMetadata({ contract });

      return {
        address: tokenAddress,
        symbol: metadata.symbol,
        chainId: chain.id,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - token metadata rarely changes
    retry: 2, // Retry twice on failure
    placeholderData: {
      address: tokenAddress,
      symbol: "TOKEN",
      chainId: chain.id,
    },
  });

  return {
    tokenInfo: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
