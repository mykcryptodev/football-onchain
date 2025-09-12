import { chain } from "@/constants";
import { useCallback, useState } from "react";

export interface Token {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  iconUri: string;
  prices: Record<string, number>;
}

export interface TokensResponse {
  result: {
    tokens: Token[];
    pagination: {
      hasMore: boolean;
      limit: number;
      page: number;
    };
  };
}

export function useTokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTokens = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setCurrentPage(1);
        setHasMore(true);
      }

      try {
        const response = await fetch(
          `/api/tokens?chainId=${chain.id}&page=${page}&limit=20`,
        );

        if (response.ok) {
          const data: TokensResponse = await response.json();
          const newTokens = data.result.tokens;

          if (append) {
            setTokens(prev => [...prev, ...newTokens]);
          } else {
            setTokens(newTokens);
          }

          const hasMoreValue =
            data.result.pagination?.hasMore ?? newTokens.length === 20;
          setHasMore(hasMoreValue);
          setCurrentPage(page);
        } else {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
        throw error;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  const loadMoreTokens = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTokens(currentPage + 1, true);
    }
  }, [fetchTokens, currentPage, hasMore, loadingMore]);

  const resetTokens = useCallback(() => {
    setTokens([]);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  return {
    tokens,
    loading,
    loadingMore,
    hasMore,
    currentPage,
    fetchTokens,
    loadMoreTokens,
    resetTokens,
  };
}
