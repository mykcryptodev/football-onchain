# Redis Caching Setup

This project uses Upstash Redis for caching contest data to reduce blockchain reads and improve performance.

## Setup

1. **Create an Upstash Redis database**:
   - Go to [Upstash Console](https://console.upstash.com/)
   - Create a new Redis database
   - Copy the REST URL and REST Token

2. **Configure environment variables**:

   ```bash
   # Add to your .env.local file
   UPSTASH_REDIS_REST_URL=your_redis_url_here
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   ```

3. **Test the setup**:
   - The API will work without Redis (falls back to blockchain reads)
   - With Redis configured, contest data will be cached for 1 hour
   - Check console logs to see cache hits/misses

## Features

- **Contest Data Caching**: Contest data is cached for 1 hour (3600 seconds)
- **Automatic Fallback**: If Redis is not configured, the API falls back to direct blockchain reads
- **Cache Invalidation**: Utility functions available for invalidating cache when data changes
- **Performance**: Reduces blockchain reads and improves response times

## Cache Keys

- Contest data: `contest:{chainId}:{contestId}`
  - Example: `contest:84532:0` (contest 0 on Base Sepolia)
  - Example: `contest:1:0` (contest 0 on Ethereum mainnet)

## Cache Utilities

Located in `src/lib/cache-utils.ts`:

- `invalidateContestCache(contestId, chainId?)` - Invalidate specific contest cache
- `invalidateMultipleContestCaches(contestIds, chainId?)` - Invalidate multiple contest caches
- `getContestFromCache(contestId, chainId?)` - Get contest data from cache only
- `setContestInCache(contestId, data, chainId?)` - Set contest data in cache

All functions accept an optional `chainId` parameter. If not provided, it uses the default chain from constants.

## Future Enhancements

- Cache invalidation on contest state changes (box claims, reward payments)
- Additional caching for game scores and box owners
- Cache warming strategies
- Redis monitoring and metrics
