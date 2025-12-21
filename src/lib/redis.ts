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

// Cache TTL constants
export const CACHE_TTL = {
  CONTEST: 3600, // 1 hour in seconds
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
    const errorMessage =
      error instanceof Error ? error.message : String(error);
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
      console.error(
        "Upstash Redis client error detected. This may indicate:",
        {
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
        },
      );
    }

    return fallback;
  }
}
