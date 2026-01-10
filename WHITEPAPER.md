# Football Boxes White Paper

## Abstract

Football Boxes is an on-chain NFL squares (boxes) game platform. Users purchase a grid square and receive an NFT that represents their entry. After games complete, winners are determined from the official scores, and prizes are distributed programmatically. The system combines on-chain game logic with off-chain score data delivered via an oracle, providing auditable outcomes and predictable payouts.

## Goals

- **Fairness and transparency:** game rules, payout structures, and winning logic are executed on-chain.
- **Low-friction participation:** wallet-friendly UX with embedded wallets and multi-token entry fees.
- **Reliable results:** game outcomes are sourced through an oracle with validation windows.
- **Composable entries:** NFTs represent squares and can be inspected or shared.

## System Overview

The platform consists of:

- **Boxes contract:** manages game creation, square pricing, assignments, and payouts.
- **BoxesNFT contract:** ERC-721 tokens that encode a participant's square.
- **GameScoreOracle:** Chainlink Functions oracle that fetches results from ESPN's API and relays them on-chain.
- **Next.js application and APIs:** user-facing interface, game creation, live boards, and caching for live scores.

## Contest Lifecycle

1. **Game creation:** a boxes grid is created with parameters (square price, payout structure, grid size).
2. **Square purchase:** users buy a square, minting an NFT that records the grid coordinates.
3. **Number assignment:** the grid axes are randomized and assigned when the board fills or a cutoff time is reached.
4. **Game resolution:** the oracle delivers official scores after quarters or final.
5. **Payouts:** after a 24-hour validation delay, the contract distributes the prize pool.

## Winning Logic

- **Primary outcome:** last digits of each team's score map to the assigned row/column numbers.
- **Quarter payouts:** prizes can be split across Q1, Q2, Q3, and Final.
- **Payout structures:** winner-take-all or per-quarter payouts, configurable per game.

## Oracle Design

The oracle fetches data from ESPN's API and reports:

- winner for each game
- total points
- quarter-by-quarter scores

The reporting window includes a 24-hour delay to allow for score corrections and minimize disputes.

## Economic Model

- **Square price:** paid in ETH or supported tokens (e.g., USDC).
- **Treasury fee:** 2% of entry amounts, used for platform operations.
- **Prize pool:** remaining funds are distributed according to the selected payout structure.

## Security Considerations

- **Deterministic outcomes:** winning logic is deterministic and executed on-chain.
- **Oracle resilience:** delayed settlement and transparent oracle updates mitigate data errors.
- **On-chain payouts:** prize distribution is handled by the contract to avoid custodial risk.

## Roadmap

- Expanded game formats (multiple boards per game, season-long series).
- Enhanced NFTs (metadata updates and on-chain visuals).
- Additional data providers for oracle redundancy.

## Glossary

- **Boxes:** the main squares game contract.
- **BoxesNFT:** ERC-721 token representing a user's square.
- **Oracle:** off-chain data source relaying game results on-chain.
