import { QueryClient } from "@tanstack/react-query";

import { getContestCacheKey, redis } from "./redis";
import { queryKeys } from "./query-keys";
import { chain } from "@/constants";

/**
 * Invalidate contest cache by contest ID (Redis only)
 * This should be called when contest data changes (e.g., boxes claimed, rewards paid)
 */
export async function invalidateContestCache(
  contestId: string,
  chainId?: number,
): Promise<void> {
  if (!redis) return;

  const cacheKey = getContestCacheKey(contestId, chainId);
  await redis.del(cacheKey);
}

/**
 * Invalidates both Redis and React Query caches for a contest.
 * Call this after any mutation that affects contest data (claim boxes, process payouts, etc.)
 */
export async function invalidateContestCaches(
  contestId: string,
  queryClient: QueryClient,
  chainId: number = chain.id
): Promise<void> {
  // 1. Invalidate Redis cache via API (existing logic)
  await fetch(`/api/contest/${contestId}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId }),
  });

  // 2. Invalidate React Query cache - triggers automatic refetch
  await queryClient.invalidateQueries({
    queryKey: queryKeys.contest(contestId),
  });
}

/**
 * Invalidates game scores cache (React Query only - no Redis for scores)
 */
export async function invalidateGameScoresCache(
  gameId: string,
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.gameScores(gameId),
  });
}

/**
 * Invalidate multiple contest caches
 */
export async function invalidateMultipleContestCaches(
  contestIds: string[],
  chainId?: number,
): Promise<void> {
  if (!redis) return;

  const cacheKeys = contestIds.map(id => getContestCacheKey(id, chainId));
  await redis.del(...cacheKeys);
}

/**
 * Get contest data from cache without fallback to blockchain
 * Useful for checking if data exists in cache
 */
export async function getContestFromCache(
  contestId: string,
  chainId?: number,
): Promise<unknown | null> {
  if (!redis) return null;

  const cacheKey = getContestCacheKey(contestId, chainId);
  return await redis.get(cacheKey);
}

/**
 * Set contest data in cache with default TTL
 */
export async function setContestInCache(
  contestId: string,
  data: unknown,
  chainId?: number,
): Promise<void> {
  if (!redis) return;

  const cacheKey = getContestCacheKey(contestId, chainId);
  await redis.setex(cacheKey, 3600, data); // 1 hour TTL
}
