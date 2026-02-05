import { QueryClient } from "@tanstack/react-query";

import { chain } from "@/constants";

import { queryKeys } from "./query-keys";
import { getContestCacheKey, getListingsCacheKey, redis } from "./redis";

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
  chainId: number = chain.id,
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
  queryClient: QueryClient,
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

export async function setContestInCache(
  contestId: string,
  data: unknown,
  chainId?: number,
): Promise<void> {
  if (!redis) return;

  const cacheKey = getContestCacheKey(contestId, chainId);
  await redis.setex(cacheKey, 3600, data);
}

export async function invalidateListingsCache(
  contestId: string,
  queryClient: QueryClient,
  chainId: number = chain.id,
): Promise<void> {
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"cache-utils.ts:99",message:"invalidateListingsCache called",data:{ contestId,chainId },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"C" }) }).catch(()=>{});
  // #endregion
  const refreshResponse = await fetch(`/api/opensea/listings/${contestId}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId }),
  });
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"cache-utils.ts:107",message:"Redis refresh response",data:{ contestId,status:refreshResponse.status,ok:refreshResponse.ok },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"C" }) }).catch(()=>{});
  // #endregion

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"cache-utils.ts:112",message:"Before invalidateQueries",data:{ contestId,queryKey:queryKeys.boxListings(contestId) },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"A" }) }).catch(()=>{});
  // #endregion
  await queryClient.invalidateQueries({
    queryKey: queryKeys.boxListings(contestId),
  });
  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"cache-utils.ts:118",message:"After invalidateQueries completed",data:{ contestId },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"A" }) }).catch(()=>{});
  // #endregion
}

export async function invalidateListingsRedisCache(
  contestId: string,
  chainId?: number,
): Promise<void> {
  if (!redis) return;

  const cacheKey = getListingsCacheKey(contestId, chainId);
  await redis.del(cacheKey);
}
