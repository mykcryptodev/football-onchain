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
| POST `/{id}/parse` | Numbered text to validated picks; optional explicit random fill |
| GET `/{id}/entry-count?wallet=…` | Original submission count for duplicate-entry protection |
| POST `/{id}/entry` | Next approval/reset/entry transaction, simulated for caller |
| GET `/{id}/entries?wallet=…&cursor=…` | Current NFT-owned entries, 50 candidate entries per page |
| GET `/{id}/entries?tokenId=…` | One verified contest entry |
| GET `/{id}/leaderboard?limit=10&cursor=…` | Provisional completed-game scores and onchain prize positions |
| GET / POST `/{id}/settlement` | Current step; POST takes wallet and simulates next transaction |

Amounts and chain IDs use exact contract data; bigint JSON fields are decimal strings. Templates retain contract `gameIds` order, even if kickoffs move. The tiebreaker must be supplied explicitly. The parse response's random picks must be preserved across approvals/retries. Entry preparation requires the original `expectedEntryCount`; it rejects a changed count rather than silently buying a second entry.

`/pickem/{id}/picks` is the copyable blank template. `/pickem/{id}/entries/{tokenId}` displays one confirmed entry, including current NFT owner, without requiring a wallet connection. Its metadata points to `/api/og/pickem/{id}/picks?tokenId=…`, reusing the homepage hero's palette, field lines and ring. The image shows the entry number and completed-game score, not an invented live rank.

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

## Bankr format and channel findings

- Bankr explicitly supports direct Markdown URLs on non-GitHub hosts: https://docs.bankr.bot/skills/in-bankr/from-github/
- Skills use YAML frontmatter and Markdown: https://docs.bankr.bot/skills/in-bankr/skill-format/
- Bankr documents recurring Agent Command automations: https://docs.bankr.bot/agent/automations/
- No Bankr-specific long-X-reply guarantee was found in its published documentation, including the full documentation index: https://docs.bankr.bot/llms-full.txt

Therefore X replies use a conservative 280-character budget and link to the full template/entry. The web terminal can show the full copyable card. This is a compatibility choice, not a claim that Bankr cannot post longer replies.

Settlement responses in `pay`, `wait` and `complete` include a `payout` breakdown with current winning NFT owners, exact base-unit amounts, treasury fee, claimed flags, unpaid total and any unallocated tiers/rounding dust. This mirrors contract arithmetic without reallocating unused prize tiers. Completion requires every winner’s claim flag; historical recipients must come from receipt events because NFTs can transfer after payout.
