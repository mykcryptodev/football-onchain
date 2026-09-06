---
name: pickem
description: >
  Join an existing NFL Pick'em contest, submit or edit your weekly picks,
  check your own picks, see the live leaderboard, and pay out a finished
  contest in one prompt. Onchain on Base — entries mint an NFT, prizes settle
  via a single permissionless contract call. Trigger on "join pickem
  contest #N", "make my picks", "what did I pick", "who's winning contest
  #N", "pay out contest #N", or a superbowlsquares.app/pickem/* link. This
  skill never creates contests — contest creation is deliberately left off
  Bankr to avoid fragmenting player pools across lots of tiny, one-off
  contests; direct anyone who wants to start a new contest to
  https://superbowlsquares.app/contest/create.
tags: [base, nfl, pickem, prediction, sports, football]
version: 1
visibility: public
metadata:
  clawdbot:
    emoji: "🏈"
    homepage: "https://superbowlsquares.app"
    requires:
      bins: []
---

# Pick'em (Football Boxes)

NFL Pick'em contests on **Base** (chain ID `8453`). A contest covers one
week's slate of games; entering costs a fixed entry fee and mints an ERC-721
"prediction" NFT holding that entry's picks. After the week's games finish,
anyone can trigger a single transaction that pays every winner at once.

This skill is a thin, deterministic front for a handful of API routes hosted
on the app itself (`https://superbowlsquares.app`) — **not** the
[BankrBot/skills](https://github.com/BankrBot/skills) catalog repo. Install
it directly by URL:

```
install the pickem skill from https://superbowlsquares.app/skills/pickem/SKILL.md
```

## Why a skill and not raw contract calls

`submitPredictions` takes a `uint8[]` of picks and `claimAllPrizes` needs
exact prize math — the kind of thing an LLM is bad at getting byte-perfect
from a natural-language description, and a bad encode either reverts or
(worse) silently submits the wrong picks. So **every write in this skill
goes through the app's API first**: you send it structured data (which team
was picked for which numbered game), it validates against the live contest
and ESPN schedule, and hands back exact `{ to, data, value, chainId }`
calldata plus a plain-English summary. Your job is to parse the user's
message into that structured shape, show the summary for confirmation, then
submit the returned transaction(s) with your own wallet tools exactly as
given — never hand-construct the `picks` array or a prize amount yourself.

**One-time setup**: submitting picks and paying out both call custom
contract functions, which Bankr treats as "arbitrary contract calls" — off
by default. The user needs to enable it once (permanently, or for a timed
window) at **bankr.bot → Security**. If a submission is rejected for this
reason, tell them exactly that and point them there — don't try to route
around it.

## Contracts (Base mainnet)

| Contract | Address |
|---|---|
| Pickem | `0xD2BB06162f80CC377b55eC531a59a6a62301E09C` |
| PickemNFT | `0x524441f074F453681ac6e7F1d6DFe1Cd6CE1b934` |

You never need to call these directly — the API below returns ready-to-sign
calldata for the two writes this skill uses (`submitPredictions`,
`claimAllPrizes`). They're listed for context/verification only.

## API base URL

```
https://superbowlsquares.app
```

All endpoints are public GET/POST JSON, no API key. `{contestId}` is the
numeric Pickem contest id — pull it from whatever the user gives you
("contest #5", "contest 5", or a link like
`https://superbowlsquares.app/pickem/5`).

## The five things this skill does

### 1. Join a contest (show the pick template)

```
GET /api/pickem/{contestId}
```

Returns the contest's season/week, entry fee, prize pool, deadline, and a
**numbered, chronological `games` list** (`{ number, matchup, awayAbbr,
homeAbbr, kickoff }`) — this is the source of truth for numbering, never
invent your own order. If `submissionOpen` is `false`, tell the user entries
are closed instead of proceeding.

Reply with the copy-paste template, one line per game, in order:

```
Contest #5 — Week 3 · Entry: 1.00 USDC
Reply with your picks, e.g. "1. NE  2. NYG":
1. CLE @ NE
2. SEA @ NYG
3. DAL @ PHI
...
```

Mention they can also say "fill in the rest randomly" after picking a few,
or leave off the matchup entirely once they know the numbering (see below).
See **Reply length & when to link out instead** before sending this — a
16-game week will not fit in a 280-character reply.

### 2. Make picks (parse the reply, then submit)

The user replies in one of several equally valid shapes — all mean the same
thing, just parse whichever they used:

- `1. CLE vs NE: NE` / `1. CLE @ NE: NE`
- `1. NE` (team only — match it against the game you showed for that number)
- A mix, e.g. `1. NE\n2. NYG\nfill in the rest randomly`
- Full names instead of codes ("Patriots", "Pats") — normalize to the
  abbreviation from the `games` list before calling the API; the API only
  matches the exact abbreviation it returned, case-insensitively.

Build the request body from what you parsed and call:

```
POST /api/pickem/{contestId}/entry
{
  "wallet": "0x...",              // the user's Bankr wallet address
  "picks": [{ "number": 1, "team": "NE" }, { "number": 2, "team": "NYG" }],
  "fillRemaining": "random",       // omit if every game was picked explicitly
  "tiebreakerPoints": 45           // omit to default to the last game's Vegas over/under
}
```

- `fillRemaining` accepts `"random" | "home" | "away"`. Omit only when every
  game in the contest has an explicit pick — otherwise the API 400s with the
  missing game numbers so you can ask the user instead of guessing.
- If a team doesn't match either side of the numbered game, the API 400s
  naming exactly which pick was bad — relay that, don't retry blindly.
- A successful response has `summary` (the resolved picks + tiebreaker, for
  a final confirmation) and `transactions`: an array of one or two
  `{ to, data, value, chainId, description }` entries — an ERC-20 `approve`
  first only if the wallet's allowance is short, then `submitPredictions`.
  **Show the summary, get a yes, then submit each transaction in order** via
  "Submit this transaction: {json}" (wait for the approve to confirm before
  sending the second one). Don't submit before the user has confirmed the
  matched picks — a misparsed team name is otherwise irreversible once
  broadcast.
- The response's `afterSubmit.picksUrl` is the link to give the user once
  the entry transaction confirms.

### 3. View your own picks

```
GET /api/pickem/{contestId}/picks?wallet=0x...
```

Returns every entry that wallet holds in the contest (usually one) with
each game's matchup, the pick, correct/wrong/pending, current score, and
live rank. `entered: false` means they haven't joined — offer the join flow
instead. Prefer linking to `picksUrl` over reciting every row for anything
past a handful of games (see length guidance below) — it's an OG-carded page
styled to match the app, so it previews nicely wherever it's pasted.

### 4. Who's winning (leaderboard)

```
GET /api/pickem/{contestId}/leaderboard?limit=10
```

Always computed live from each entry's picks against current ESPN scores —
the contract's own on-chain leaderboard only ever stores the **top N = payout
positions** (e.g. just the single winner for a winner-take-all contest), so
it can't answer "who's winning" for anyone outside the money. Each row has
`rank`, `rankLabel` ("1st"), `owner`/`ownerShort`, `correctPicks`,
`gamesDecided`/`totalGames`, and — once the contest is finalized —
`prizeFormatted`. `status` is `"live"` mid-week or `"final"` once every game
is decided.

### 5. Payout — one prompt, one transaction

```
POST /api/pickem/{contestId}/payout
```

No body needed. This checks every on-chain precondition for you
(`gamesFinalized`, the 24h post-finalization delay, not already paid out,
winners exist) and either:

- `{ "ready": false, "reason": "...", "unlocksAt": "..." }` — relay the
  reason verbatim (e.g. still waiting on the oracle, or payouts unlock at a
  given time). Don't retry the transaction path when this happens.
- `{ "ready": true, "preview": { "winners": [...], "totalPrizePoolFormatted": "..." }, "transaction": {...} }`
  — show the preview (who gets paid, how much), confirm, then submit
  `transaction` as-is. It calls `claimAllPrizes`, which is **permissionless
  and pays every remaining winner in a single transaction** — there is no
  per-winner loop to run.

This is the whole "conduct the payout" flow: one prompt in, one confirmed
transaction out, every winner paid.

## Reply length & when to link out instead

Standard X/Twitter replies are capped at **280 characters** — a numbered
list for a full NFL week (up to 16 games) will not fit alongside any lead-in
text, and don't assume Bankr's account has (or that a given reply channel
respects) a long-form exception. Before sending a reply that includes the
numbered game list or a full picks/leaderboard table:

1. Render the text and count it.
2. **≤ ~260 characters** (leaving headroom for the platform's own framing):
   send it inline as shown above.
3. **Longer than that**, or the channel is X specifically: send one short
   line plus the relevant link instead — `picksUrl` for "make picks" /
   "view my picks", the contest page (`https://superbowlsquares.app/pickem/{contestId}`)
   for a fresh join prompt on a big slate, e.g.:
   > Contest #5 (Week 3, 14 games) is too long to fit here — pick here:
   > https://superbowlsquares.app/pickem/5

Every one of these links carries a Farcaster/OG card in the same visual
style as the app's homepage hero (dark green field, lime accent, live prize
pool), so it previews well wherever it's pasted — don't strip it down to a
bare URL if you have room for the one-line lead-in above it.

## What this skill will not do

- **Create contests.** Contest creation is intentionally left off Bankr —
  letting anyone spin one up trivially fragments player pools across lots of
  small contests instead of a few well-populated ones. If asked, point to
  `https://superbowlsquares.app/contest/create`.
- **Guess picks or a tiebreaker number.** Every pick comes from the user's
  message or an explicit `fillRemaining` policy; the tiebreaker default
  (Vegas over/under of the last game) is disclosed in the response
  (`tiebreakerDefaulted: true`) — say so rather than presenting it as the
  user's own number.
- **Submit a transaction the user hasn't confirmed.** All five endpoints
  above are read-only or calldata-building only; nothing broadcasts until
  you submit the returned transaction yourself.

## Troubleshooting

| Situation | What to do |
|---|---|
| `submissionOpen: false` on the contest, or the entry endpoint 409s "Entries are closed" | Tell the user picks closed at `submissionDeadline`; don't attempt the transaction. |
| Entry endpoint 400s with `missingGameNumbers` | Ask the user for those specific games, or confirm a `fillRemaining` policy and retry. |
| Entry endpoint 400s with `details` (bad team match) | Relay the exact mismatch (e.g. "DAL doesn't play in game #3") — don't silently substitute a guess. |
| A write transaction reverts or is rejected for "arbitrary contract calls" | Point the user to bankr.bot → Security to enable arbitrary contract calls (permanently or a timed window), then retry. |
| Payout endpoint returns `ready: false` | Relay `reason` (and `unlocksAt` if present) verbatim; don't build or guess a `claimAllPrizes` transaction yourself. |
| `entered: false` on the picks endpoint | The wallet hasn't joined this contest — offer the join flow (step 1) instead of an empty picks list. |
| Leaderboard `status: "live"` with `prizeFormatted: null` | Expected — prize amounts only firm up once the contest is `"final"`; report the score/rank without a dollar figure. |
