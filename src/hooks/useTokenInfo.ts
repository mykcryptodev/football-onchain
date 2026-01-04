"use client";

import { useEffect, useState } from "react";
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
 */
export function useTokenInfo(tokenAddress: string): UseTokenInfoResult {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTokenInfo() {
      try {
        setIsLoading(true);
        setError(null);

        const isNative =
          tokenAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase();

        if (isNative) {
          if (isMounted) {
            setTokenInfo({
              address: ZERO_ADDRESS,
              symbol: "ETH",
              chainId: chain.id,
            });
          }
          return;
        }

        const contract = getContract({
          client,
          chain,
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
        });

        const metadata = await getCurrencyMetadata({ contract });

        if (isMounted) {
          setTokenInfo({
            address: tokenAddress,
            symbol: metadata.symbol,
            chainId: chain.id,
          });
        }
      } catch (err) {
        console.error("Error fetching token info:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch token info"),
          );
          // Fallback to generic token
          setTokenInfo({
            address: tokenAddress,
            symbol: "TOKEN",
            chainId: chain.id,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchTokenInfo();

    return () => {
      isMounted = false;
    };
  }, [tokenAddress]);

  return { tokenInfo, isLoading, error };
}
