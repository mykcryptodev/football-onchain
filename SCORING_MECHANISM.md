# Pickem Contract - Real-Time Leaderboard Scoring Mechanism

## Overview

The Pickem contract uses a gas-efficient, real-time leaderboard system that updates automatically as scores are calculated. Winners are determined instantly when scores are submitted, eliminating the need for separate winner calculation transactions.

## Key Features

1. **Real-Time Leaderboard**: As scores are calculated, they're immediately added to a sorted leaderboard
2. **Automatic Winner Determination**: Top N entries are maintained in storage at all times
3. **24-Hour Delay Before Payout**: Ensures all users have time to calculate scores
4. **Permissionless**: Anyone can calculate any user's score
5. **Gas Optimized**: Minimal storage reads/writes, efficient insertion sort

## Architecture

### Leaderboard Structure

```solidity
struct LeaderboardEntry {
    uint256 tokenId;        // The prediction token
    uint8 score;           // Number of correct picks
    uint256 tiebreakerPoints; // For tiebreaking
    uint256 submissionTime;   // Earlier submission wins ties
}

// contestLeaderboard[contestId] => sorted array of top N entries
// where N = number of payout positions (1 for winner-take-all, 3 for top-3, 5 for top-5)
```

### New Contest Fields

**PickemContest:**

- `payoutDeadline` - 24 hours after games finalized - when payouts can start

**UserPrediction:**

- `scoreCalculated` - Boolean flag indicating if this prediction's score has been calculated

## Core Functions

### 1. `calculateScore(uint256 tokenId)` - Individual Score Calculation

Anyone can call this to calculate a specific user's score.

**Process:**

1. Validates token exists and isn't already calculated
2. Calculates the score
3. Updates leaderboard if score makes top N
4. Emits `ScoreCalculated` and potentially `LeaderboardUpdated` events

**Gas Usage:** Fixed cost per calculation, independent of total entries

### 2. `calculateScoresBatch(uint256[] calldata tokenIds)` - Bulk Calculation

Calculate multiple scores in one transaction.

**Optimizations:**

- Caches contest finalization status per contest
- Skips already-calculated scores
- Efficient for calculating many entries from same contest

### 3. Internal `_updateLeaderboard()` - Maintains Top N

Automatically called by calculate functions.

**Algorithm:**

1. Creates new entry with score + tiebreaker data
2. If leaderboard not full: insert in sorted position
3. If leaderboard full: check if beats worst entry, replace if better
4. Uses insertion sort to maintain order

**Comparison Logic (`_isEntryBetter`):**

1. Higher score wins
2. If tied: Closer tiebreaker prediction wins
3. If still tied: Earlier submission time wins

## Workflow

### 1. Contest Finalization

```solidity
updateContestResults(contestId);
// Sets payoutDeadline = block.timestamp + 24 hours
// Emits PayoutPeriodStarted event
```

### 2. Score Calculation (during 24-hour window)

**Option A: Users calculate their own scores**

```solidity
calculateScore(myTokenId);
// Automatically updates leaderboard if score qualifies
```

**Option B: Bulk calculation (by anyone)**

```solidity
// Get user's tokens
uint256[] memory myTokens = getUserTokensForContest(contestId, myAddress);

// Calculate all scores
calculateScoresBatch(myTokens);
```

**Option C: Calculate for all users (permissionless)**

```solidity
// Off-chain: Get all entries for contest
// Then batch calculate in chunks
calculateScoresBatch([token1, token2, token3, ...]);
```

### 3. Prize Claims (after 24 hours)

```solidity
// After payoutDeadline passes, winners can claim
claimPrize(contestId, tokenId);
// or
claimAllPrizes(contestId);
```

## Events

### `ScoreCalculated(contestId, tokenId, correctPicks)`

Emitted when a score is calculated.

### `LeaderboardUpdated(contestId, tokenId, score, position)`

Emitted when a score makes it onto the leaderboard (position 0 = 1st place).

### `PayoutPeriodStarted(contestId, deadline)`

Emitted when games finalize and 24-hour countdown begins.

## View Functions

### `getContestLeaderboard(contestId)`

Returns the full leaderboard with all entry details.

```solidity
LeaderboardEntry[] memory leaderboard = getContestLeaderboard(contestId);
// leaderboard[0] = 1st place
// leaderboard[1] = 2nd place
// etc.
```

### `getContestWinners(contestId)`

Returns just the token IDs from the leaderboard.

```solidity
uint256[] memory winners = getContestWinners(contestId);
// winners[0] = 1st place tokenId
```

## Gas Optimization Techniques

### 1. Real-Time Updates Eliminate Batch Processing

**Old Approach:**

- Collect all scores
- Sort everything at once
- High gas cost, risk of running out of gas

**New Approach:**

- Update leaderboard incrementally
- Only maintain top N entries
- Predictable gas cost per score

### 2. Storage Optimization

- Single `insertPos` variable declaration
- Load entry data to memory before comparison
- Minimize storage reads in comparison function
- Cache contest data when processing batches

### 3. Insertion Sort Efficiency

For maintaining top N:

- Only N entries stored (not all entries)
- Insertion happens once per score
- O(N) complexity where N is small (1, 3, or 5)
- Much cheaper than sorting all entries

### 4. Smart Comparison

```solidity
// Efficient tiebreaker check
function _isEntryBetter(...) {
    if (scoreA > scoreB) return true;  // Fast path
    if (scoreA < scoreB) return false; // Fast path

    // Only load game results if scores tied
    // ...tiebreaker logic
}
```

## Example: Complete Contest Flow

```solidity
// 1. Games finish, oracle updates results
updateContestResults(contestId);
// Event: GamesFinalized(contestId)
// Event: PayoutPeriodStarted(contestId, deadline)

// 2. Users calculate scores (anytime during 24 hours)
calculateScore(token1);
// Event: ScoreCalculated(contestId, token1, 10)
// Event: LeaderboardUpdated(contestId, token1, 10, 0)  // Takes 1st place

calculateScore(token2);
// Event: ScoreCalculated(contestId, token2, 12)
// Event: LeaderboardUpdated(contestId, token2, 12, 0)  // New 1st place
// Event: LeaderboardUpdated(contestId, token1, 10, 1)  // Moved to 2nd

calculateScore(token3);
// Event: ScoreCalculated(contestId, token3, 8)
// (No LeaderboardUpdated - didn't make top N)

// 3. View leaderboard anytime
LeaderboardEntry[] memory leaderboard = getContestLeaderboard(contestId);
// leaderboard[0].tokenId = token2 (12 correct)
// leaderboard[1].tokenId = token1 (10 correct)

// 4. After 24 hours, claim prizes
claimPrize(contestId, token2);  // 1st place claims
claimPrize(contestId, token1);  // 2nd place claims
```

## Advantages Over Previous Approach

### Before (Batch Winner Determination)

❌ Required collecting all token IDs
❌ Risk of running out of gas with many entries
❌ Needed separate `determineWinners()` transaction
❌ More complex with `contestWinners` mapping
❌ Repeated storage reads for comparisons

### After (Real-Time Leaderboard)

✅ Winners determined as scores are calculated
✅ Fixed gas cost per score calculation
✅ No separate winner determination needed
✅ Simple, single leaderboard array
✅ Optimized storage access patterns
✅ Immediate feedback via `LeaderboardUpdated` events

## Important Notes

1. **Leaderboard Auto-Updates**: No need to call a separate function to determine winners - they're determined automatically as scores are calculated.

2. **24-Hour Period Purpose**: Gives all users time to calculate their scores before payouts begin. It's not required that all scores be calculated - only the top N matter.

3. **Permissionless Scoring**: Anyone can calculate anyone else's score, enabling:
   - Users calculating their own scores
   - Contest operators batch-calculating all scores
   - Community members helping finalize contests
   - Automated services ensuring timely calculation

4. **Top N Only**: The leaderboard only stores the top N entries where N is based on payout structure (1, 3, or 5). Other entries don't consume storage.

5. **Idempotent**: Calculating the same score twice is prevented by the `scoreCalculated` flag.

6. **View Functions**: Both `getContestWinners()` and `getContestLeaderboard()` can be called anytime to see current standings.
