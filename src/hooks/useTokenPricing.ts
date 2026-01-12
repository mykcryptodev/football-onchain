"use client";

import { useQuery } from "@tanstack/react-query";
import { ZERO_ADDRESS } from "thirdweb";

import { chain, usdc } from "@/constants";
import type { TokensResponse } from "@/hooks/useTokens";

type TokenPricing = {
  priceUsd: number;
  decimals: number;
};

type UseTokenPricingResult = {
  pricing: TokenPricing | null;
  isLoading: boolean;
  error: Error | null;
};

export function useTokenPricing(tokenAddress: string): UseTokenPricingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tokens", "pricing", tokenAddress],
    queryFn: async () => {
      const lowerAddress = tokenAddress.toLowerCase();
      const usdcAddress = usdc[chain.id]?.toLowerCase();

      if (usdcAddress && lowerAddress === usdcAddress) {
        return { priceUsd: 1, decimals: 6 };
      }

      if (lowerAddress === ZERO_ADDRESS.toLowerCase()) {
        return null;
      }

      const response = await fetch(
        `/api/tokens?chainId=${chain.id}&name=${tokenAddress}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch token pricing: ${response.status}`);
      }

      const data: TokensResponse = await response.json();
      const token = data.result.tokens[0];

      if (!token) {
        return null;
      }

      return {
        priceUsd: token.priceUsd,
        decimals: token.decimals,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    pricing: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
