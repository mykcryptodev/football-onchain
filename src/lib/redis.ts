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
