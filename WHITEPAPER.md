# Football Pick 'Em White Paper

## Abstract

Football Pick 'Em is an on-chain NFL prediction contest platform. Users submit weekly picks and receive an NFT that represents their entry. After games complete, contest results are scored transparently and prizes are distributed programmatically. The system combines on-chain contest logic with off-chain game data delivered via an oracle, providing auditable outcomes and predictable payouts.

## Goals

- **Fairness and transparency:** contest rules, payout structures, and scoring are executed on-chain.
- **Low-friction participation:** wallet-friendly UX with embedded wallets and multi-token entry fees.
- **Reliable results:** game outcomes are sourced through an oracle with validation windows.
- **Composable entries:** NFTs represent picks and can be inspected or shared.

## System Overview

The platform consists of:

- **Pickem contract:** manages contest creation, entry fees, scoring, and payouts.
- **PickemNFT contract:** ERC-721 tokens that encode a participant's weekly picks.
- **GameScoreOracle:** Chainlink Functions oracle that fetches results from ESPN's API and relays them on-chain.
- **Next.js application and APIs:** user-facing interface, contest creation, leaderboards, and caching for live scores.

## Contest Lifecycle

1. **Contest creation:** a contest is created with parameters (entry fee, payout structure, contest size).
2. **Entry submission:** users pay the entry fee and submit picks, minting an NFT that records selections.
3. **Game resolution:** the oracle delivers official game results after games finish.
4. **Scoring and ranking:** scores are calculated based on correct picks, with ties resolved via tiebreakers.
5. **Payouts:** after a 24-hour validation delay, the contract distributes the prize pool.

## Scoring and Tiebreakers

- **Primary score:** number of correct picks for the week.
- **Tiebreakers:** total points for a designated game and quarter-by-quarter data when needed.
- **Payout structures:** winner-take-all, top-3, or top-5, configurable per contest.

## Oracle Design

The oracle fetches data from ESPN's API and reports:

- winner for each game
- total points
- quarter-by-quarter scores

The reporting window includes a 24-hour delay to allow for score corrections and minimize disputes.

## Economic Model

- **Entry fees:** paid in ETH or supported tokens (e.g., USDC).
- **Treasury fee:** 2% of entry amounts, used for platform operations.
- **Prize pool:** remaining funds are distributed according to the selected payout structure.

## Security Considerations

- **Deterministic scoring:** scoring logic is deterministic and executed on-chain.
- **Oracle resilience:** delayed settlement and transparent oracle updates mitigate data errors.
- **On-chain payouts:** prize distribution is handled by the contract to avoid custodial risk.

## Roadmap

- Expanded contest types (season-long, survivor pools).
- Enhanced NFTs (metadata updates and on-chain visuals).
- Additional data providers for oracle redundancy.

## Glossary

- **Pickem:** the main contest contract.
- **PickemNFT:** ERC-721 token representing a user's picks.
- **Oracle:** off-chain data source relaying game results on-chain.
