# Pre-generated Pick'em entry images

Each Pick'em entry gets its own share image (picks, per-game results, entry
number) served from `/api/og/pickem/{contestId}/picks?tokenId={tokenId}`.
Unlike the contest-level OG card, this route **never reads the blockchain or
ESPN on a GET request** — it only reads a status record from Redis and, once
ready, redirects to a persisted image in Vercel Blob. Rendering happens ahead
of time, in the background, triggered by the first request that needs it.

## Why

The old version of this route rendered the image live on every request,
including from crawlers and Bankr, which meant every share re-read the chain
and ESPN. That's slow, and it means a share can silently break if either of
those is briefly unavailable. Pre-generating once and serving a static asset
fixes both.

## Pipeline

1. **Trigger.** The first single-entry lookup after an entry is submitted —
   the Bankr `GET /contests/{id}/entries?tokenId=...` branch, or a visit to
   `/pickem/{id}/entries/{tokenId}` — calls `ensureEntryImage()`
   (`src/lib/pickem-image.ts`). It claims the render job with a single
   `SET status NX` in Redis (so concurrent callers don't double-render) and
   fires the render via Next's `after()`, returning immediately with whatever
   status is known (usually `"pending"` on the very first call).
2. **Render.** `attemptImmediateRender()` (`src/lib/pickem-image-render.ts`)
   draws the card with `next/og`'s `ImageResponse` and uploads the PNG to
   Vercel Blob at a deterministic path, `pickem/{contestId}/{tokenId}.png`
   (`addRandomSuffix: false`, `allowOverwrite: true` — a re-render always
   replaces the same object). On success it writes `status: "ready"` plus the
   blob URL to Redis. On failure it schedules a retry instead of throwing.
3. **Retry.** Failures go into a Redis sorted-set queue
   (`pickem:image:queue`, scored by next-attempt time) with exponential
   backoff: 1m, 5m, 15m, 1h, 4h. The cron at `/api/cron/pickem-images` sweeps
   due items every 2 minutes and calls `renderAndStoreFromScratch()`, which
   re-fetches the contest/entry/matchups from scratch (it has nothing but the
   IDs) and renders again. After 5 total attempts a job is marked
   `"failed"` permanently — no further automatic retries.
4. **Serve.** The GET route (`src/app/api/og/pickem/[contestId]/picks/route.tsx`)
   reads only the Redis status record: `307` redirect to the blob URL when
   `"ready"`, `404` when `"failed"` or unknown, `503` with `Retry-After: 5`
   when `"pending"`.
5. **Readiness gating.** Both consumers wait for `status: "ready"` before
   treating the image as shareable:
   - The Bankr skill polls `share.status` a few times before attaching the
     image, falling back to `share.fallbackText` if it stays `"pending"` or
     goes `"failed"` (see `skills/pickem/SKILL.md`).
   - The entry page (`/pickem/{id}/entries/{tokenId}`) shows a "rendering"
     message until `status` is `"ready"`, then a direct download link; its
     `generateMetadata` points `og:image`/`twitter:image` straight at the
     blob URL once ready, and otherwise falls back to the contest-level OG
     card so the link preview is never a broken image.
6. **Cleanup.** The same cron sweeps a separate retention index
   (`pickem:image:retention`, scored by expiry time) and deletes the blob
   plus its Redis status record once an entry's image has been `"ready"` or
   `"failed"` for `PICKEM_IMAGE_RETENTION_DAYS` (default 30).

## Module map

- `src/lib/pickem-image-status.ts` — Redis-only status/queue/retention
  bookkeeping. No chain or ESPN dependency; imported by the GET route, the
  cron, and the render module.
- `src/lib/pickem-image-render.ts` — the only place that actually renders and
  uploads an image. Imports `src/lib/bankr/service.ts` for chain/ESPN reads
  (only from its from-scratch retry path); `service.ts` never imports this
  module back, so there's no cycle.
- `src/lib/pickem-image.ts` — the orchestrator (`ensureEntryImage`) called
  from the two single-entry lookup sites. Not imported by `service.ts`.
- `src/app/api/og/pickem/[contestId]/picks/route.tsx` — the zero-live-read
  GET route.
- `src/app/api/cron/pickem-images/route.ts` — the retry/cleanup sweep.

## Setup

- **Vercel Blob store.** Link a Blob store to this project (Vercel dashboard
  → Storage → Blob). Vercel then injects `BLOB_READ_WRITE_TOKEN`
  automatically in every environment; it only needs to be set by hand for
  local development against a real store.
- **Env vars** (see `env.example`):
  - `BLOB_READ_WRITE_TOKEN` — Vercel Blob write access.
  - `PICKEM_IMAGE_RETENTION_DAYS` — optional, defaults to `30`.
  - `CRON_SECRET` — already used by `/api/oracle/sync`; the new cron reuses
    the same secret and bearer-auth convention.
- **Cron.** `vercel.json` registers `/api/cron/pickem-images` on
  `*/2 * * * *`. This requires a Vercel plan that supports sub-daily cron
  schedules (the existing `/api/oracle/sync` cron already assumes this).
- **Upstash Redis.** Reuses the existing `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN` — no new Redis setup needed.

No credentials are required to review or deploy this code beyond linking the
Blob store and setting `BLOB_READ_WRITE_TOKEN`; both are one-time,
per-project setup steps in the Vercel dashboard.
