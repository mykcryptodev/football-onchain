import { getContestCacheKey, redis } from "./redis";

/**
 * Invalidate contest cache by contest ID
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
