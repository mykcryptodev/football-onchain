import { Redis } from "@upstash/redis";

import { chain } from "@/constants";

// Check if Redis environment variables are available
const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Cache key helpers
export const getContestCacheKey = (contestId: string, chainId?: number) => {
  const currentChainId = chainId || chain.id;
  return `contest:${currentChainId}:${contestId}`;
};

export const getPayoutTxKey = (contestId: string, chainId?: number) => {
  const currentChainId = chainId || chain.id;
  return `contest:payoutTx:${currentChainId}:${contestId}`;
};

export const getContestsListCacheKey = (chainId?: number) => {
  const currentChainId = chainId || chain.id;
  return `contests:list:${currentChainId}`;
};

export const getUserProfileCacheKey = (address: string) => {
  return `user-profile:${address.toLowerCase()}`;
};

export const getUserBioCacheKey = (address: string) => {
  return `user-bio:${address.toLowerCase()}`;
};

export const getGameDetailsCacheKey = (gameId: string) => {
  return `game-details:${gameId}`;
};

export const getListingsCacheKey = (contestId: string, chainId?: number) => {
  const currentChainId = chainId || chain.id;
  return `opensea:listings:${currentChainId}:${contestId}`;
};

export const getCancelledOrdersKey = (chainId?: number) => {
  const currentChainId = chainId || chain.id;
  return `cancelled:orders:${currentChainId}`;
};

/**
 * Per-game ESPN matchup data (teams, scores, completed) used by the pickem
 * skill/API and its OG images. This is the slow part of those routes — up
 * to 16 external ESPN fetches per request — and X's link-preview crawler
 * needs a fast response to render a card, so every one of these is cached.
 */
export const getPickemMatchupCacheKey = (gameId: string) => {
  return `pickem:matchup:${gameId}`;
};

export const CACHE_TTL = {
  CONTEST: 3600,
  CONTESTS_LIST: 300,
  USER_PROFILE: 900,
  // A live/upcoming game's score can change any second; a completed one
  // never will, so it's safe to cache far longer once ESPN marks it final.
  PICKEM_MATCHUP_LIVE: 20,
  PICKEM_MATCHUP_FINAL: 21600,
  USER_BIO: 86400,
  GAME_DETAILS: 300,
  OPENSEA_LISTINGS: 300,
} as const;

/**
 * Safely execute a Redis operation with error handling
 * This wrapper catches errors that might occur due to Upstash API issues
 */
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T | null = null,
): Promise<T | null> {
  if (!redis) {
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    // Check if this is the "res.map is not a function" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log detailed error for debugging
    console.error("Redis operation failed:", {
      message: errorMessage,
      stack: errorStack,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });

    // If it's a known Upstash client error, log additional context
    if (
      errorMessage.includes("map is not a function") ||
      errorMessage.includes("res.map")
    ) {
      console.error("Upstash Redis client error detected. This may indicate:", {
        possibleCauses: [
          "Invalid or expired Upstash credentials",
          "Upstash API rate limiting",
          "Network connectivity issues",
          "Upstash Redis client library bug",
        ],
        redisUrl: process.env.UPSTASH_REDIS_REST_URL
          ? `${process.env.UPSTASH_REDIS_REST_URL.substring(0, 20)}...`
          : "not configured",
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }

    return fallback;
  }
}
