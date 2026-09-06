# Bankr Pick'em integration

Install after the app is deployed:

```text
Install the skill at https://bankrball.com/skills/pickem/SKILL.md
```

The route renders `skills/pickem/SKILL.md` with the deployment's configured app URL. `NEXT_PUBLIC_APP_URL` must be the public HTTPS app origin. Next's output tracing includes the source Markdown in serverless deployment bundles. No Bankr catalog submission or Bankr API key on the app is required.

Example prompts:

- Join contest 3.
- 1. NE / 2. NYG (use separate lines), fill in the rest randomly. Tiebreaker 44.
- Show my picks in contest 3.
- Who's winning contest 3?
- Settle contest 3 and pay everyone when it unlocks.

## API and entry links

All routes live under `/api/bankr/contests`. GET reads live data. POST only validates, simulates and returns unsigned calldata; it never broadcasts a transaction or uses the oracle reporter key.

| Route | Purpose |
| --- | --- |
| GET `/` | Featured and recent open contests; cursor pagination |
| GET `/{id}` | Fee, deadline, numbered slate and tiebreaker |
| POST `/{id}/parse` | Numbered text (+ tiebreaker line) to validated picks and `tiebreakerPoints`; optional explicit random fill |
| GET `/{id}/entry-count?wallet=…` | Original submission count for duplicate-entry protection |
| POST `/{id}/entry` | Next approval/reset/entry transaction, simulated for caller |
| GET `/{id}/entries?wallet=…&cursor=…` | Current NFT-owned entries, 50 candidate entries per page |
| GET `/{id}/entries?tokenId=…` | One verified contest entry |
| GET `/{id}/leaderboard?limit=10&cursor=…` | Provisional completed-game scores and onchain prize positions |
| GET / POST `/{id}/settlement` | Current step; POST takes wallet and simulates next transaction |

Amounts and chain IDs use exact contract data; bigint JSON fields are decimal strings. Templates retain contract `gameIds` order, even if kickoffs move. The tiebreaker must be supplied explicitly. The parse response's random picks must be preserved across approvals/retries. Entry preparation requires the original `expectedEntryCount`; it rejects a changed count rather than silently buying a second entry.

`template` (from `GET /{id}`) is one copy-paste block, not just the numbered games: `pickTemplate()` (`src/lib/bankr/picks.ts`) appends a final `Tiebreaker (combined points, {away} vs {home}): ` line, and `parsePicks()` extracts it from that same text (matched by its leading word, so a retyped/reworded version of the line still parses) into `tiebreakerPoints` — `null` if that line was blank or missing entirely, same treatment as a blank game pick, never a guessed default. Before this, the tiebreaker was a separate question the skill had to track across turns by itself; folding it into the same template/parse call removes that failure mode the same way `entriesCloseAt` and the link-out hardening did for their own values — hand over the exact thing to relay, don't make the model responsible for carrying a second value alongside it.

`/{id}` and `/` both include `entriesCloseAt`, an ISO string computed server-side from the contract's `submissionDeadline`. Seen in the wild: a reply stated an entries-close date 4 days after the real deadline — the model most likely read a kickoff off `games[]` (contract `gameIds` order, not chronological) instead of the actual deadline field. `entriesCloseAt` exists specifically so there's one unambiguous, pre-formatted value to relay instead of asking the model to compute or pick one out of raw contract/game data.

`/pickem/{id}/picks` is the copyable blank template. `/pickem/{id}/entries/{tokenId}` displays one confirmed entry, including current NFT owner, without requiring a wallet connection. Its metadata points to `/api/og/pickem/{id}/picks?tokenId=…`, reusing the homepage hero's palette and field lines. The image itself renders every game the entry picked — team called, and (once decided) a green/red border for correct/wrong, gray for still pending — not just a score or rank summary, so sharing or linking the entry URL on X unfurls a card that actually shows the picks.

## Performance: link-preview speed

X (and most link-preview crawlers) fetch a link's OG image with a short timeout and give up silently if it doesn't come back in time — no card, no error shown to the poster. The slow part of every pickem read (`details`, `entries`, `leaderboard`, `settlement`, and both OG image routes) is `matchups()`: up to 16 external ESPN `summary` fetches, one per game, done in parallel but each individually slow.

`matchups()` now checks Redis (`getPickemMatchupCacheKey`, `src/lib/redis.ts`) for each game before hitting ESPN, and writes back on a miss — 20s TTL for a live/upcoming game (score can change any second), 6h once ESPN marks it `completed` (it never will again). On a cache hit this turns "up to 16 ESPN round trips" into "up to 16 Redis round trips run in parallel," which is the actual latency win for a crawler's first fetch of a freshly-shared link. Requires `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (already used elsewhere in the app); with neither set, `redis` is `null` and every call falls straight through to ESPN exactly as before — no behavior change, just no caching.

Two things considered and not done, to keep this fix scoped to the actual bottleneck:
- **Swapping the RPC endpoint** (e.g. to a Coinbase Developer Platform Base RPC) — `ORACLE_RPC_URL` already supports this (see `env.example`), but the contract reads in this file are a handful of `eth_call`s done in parallel and were not the slow part; a faster RPC does not fix a crawler timeout caused by ESPN.
- **Coinbase Developer Platform's SQL API** as a replacement data layer — would help the many-entries case (`leaderboard`, `browse`) more than a single OG image, and swapping the read layer entirely is a much larger, riskier change than caching the one slow external call. Worth revisiting if `leaderboard` on a large contest ever needs the same treatment.

## Settlement behavior and deployment dependencies

Bankr performs: request missing oracle results → wait for fulfillment → finalize contest → score every entry in batches of 25 → wait for the contract's 24-hour period → claim all prizes → verify completion. It rechecks state after every receipt. The worker/webhook/cron that already publishes authenticated oracle reports must remain operational; emitting a request does not itself publish scores.

The skill uses Bankr Agent Command automations for delayed continuation. This is instruction-driven orchestration by Bankr, not a new app-hosted scheduler. It requires that capability on the caller's Bankr account/surface. It deduplicates jobs, stores pending hashes, stops on completion/failure/expiry and never repeatedly pays to request oracle results. If automation creation is unavailable, the skill reports the unlock time and limitation instead of promising a future payout.

The planner scans every entry before permitting `claimAllPrizes`, checks exact oracle/contest slate identity, detects partially claimed unscored fields, and waits until submissions close. These are client/workflow protections; the existing contract remains permissionless and another caller can still bypass these offchain checks. No Solidity or oracle reporter permissions are changed.

Leaderboard scores are provisional ESPN completed-game scores (ties share a rank). The contract's prize leaderboard is explicitly separate and authoritative for payouts once all entries are scored. Responses paginate the displayed ranks; aggregation currently fails explicitly above 5,000 entries instead of presenting a partial ranking. Oracle tie encoding is existing contract behavior and is not changed by this integration.

## Verification

```sh
node --import tsx --test src/lib/bankr/*.test.ts
```

The tests use mocked RPC reads/simulation and verify parsing, preserving random picks, approval handoff, native fee values, duplicate protection, transferred NFTs, pagination, late unscored entries, mismatched slates and payout timing. They do not send mainnet transactions. Use the repository's installed `tsx` loader (available through its dependency tree).

After deployment, check that the skill URL returns rendered Markdown (no `{{APP_URL}}` token), fetch a real contest and a confirmed entry, check the image response, and install into a Bankr account. Paid entry and deferred Agent Command execution still require an end-to-end Bankr smoke test with an authorized wallet; no live funds were spent during implementation.

Seen in the wild: a 16-game contest correctly decided to fall back to a link-out reply, but the reply shipped with the "pick at " sentence present and no URL after it. `NEXT_PUBLIC_APP_URL=https://bankrball.com` was confirmed set correctly on the deployment (so `links.picks` from `GET /contests/{id}` was a real, well-formed URL) — this ruled out a config problem and pointed at the model dropping the literal link value while paraphrasing the "link `links.picks`" instruction. See the "reply length and share links" section of `skills/pickem/SKILL.md` for the fix: an exact reply template with the URL inline, plus a "check the URL is actually in your draft before sending" self-check.

## Bankr format and channel findings

- Bankr explicitly supports direct Markdown URLs on non-GitHub hosts: https://docs.bankr.bot/skills/in-bankr/from-github/
- Skills use YAML frontmatter and Markdown: https://docs.bankr.bot/skills/in-bankr/skill-format/
- Bankr documents recurring Agent Command automations: https://docs.bankr.bot/agent/automations/
- No Bankr-specific long-X-reply guarantee was found in its published documentation, including the full documentation index: https://docs.bankr.bot/llms-full.txt

That absence of a documented guarantee was originally read as "assume 280 and link out." Confirmed otherwise: Bankr's X replies are not actually capped at 280 characters, so the skill now sends the full template directly on X too, same as the web terminal, and only links out on an actual rejected/truncated send rather than a precomputed length threshold.

Settlement responses in `pay`, `wait` and `complete` include a `payout` breakdown with current winning NFT owners, exact base-unit amounts, treasury fee, claimed flags, unpaid total and any unallocated tiers/rounding dust. This mirrors contract arithmetic without reallocating unused prize tiers. Completion requires every winner’s claim flag; historical recipients must come from receipt events because NFTs can transfer after payout.


### Required entry image delivery

The verified `GET /api/bankr/contests/{id}/entries?tokenId={tokenId}` response wraps the entry in `entries[]`. Each entry's `share` includes `text`, `imageUrl`, `imageAlt`, `markdown` (inline image plus share text), and `fallbackText` (entry link plus direct image link). These are app response fields, not a Bankr-specific media API schema.

The skill now makes image delivery a separate required post-confirmation step: GET and validate the image, attach it through the current reply surface (uploading bytes if required), or use the exact Markdown on surfaces that render images. A link preview is not a substitute for an X media attachment. If media delivery is unavailable or fails after one fetch retry, report that limitation and include both direct links; never re-enter the contest to retry delivery.

After merging/deploying, reinstall the hosted skill in Bankr with `install the skill from https://bankrball.com/skills/pickem/SKILL.md`. Installed skills must be refreshed; repository edits alone do not prove the account loaded the new instructions. Bankr documents that repeating the install overwrites the previous version: https://docs.bankr.bot/skills/in-bankr/skill-format/.

Validate through Bankr using an existing confirmed entry first: ask to resend that entry's picks image without making a new entry. Check the X reply contains actual attached media for the matching token ID. App response tests cannot verify Bankr's hosted reply transport; no documented native @bankrbot media tool schema was found, so the skill uses only capabilities actually exposed at runtime and reports their absence honestly.
