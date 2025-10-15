<!-- 6ef6c354-92c0-415d-acea-14b130069523 dbd37177-55c4-466f-bb27-7b28e8d52819 -->
# Fix GameScoreOracle Game Order Mismatch

## Problem Identified

The bug is in the **game ordering mismatch** between two oracle functions:

### Root Cause

1. **`fetchWeekGames()`** fetches game IDs from ESPN API and stores them in the order ESPN returns them
2. **`fetchWeekResults()`** fetches game results and stores winners as bits based on the iteration order
3. The Pickem contract assumes winners[i] corresponds to gameIds[i], but **ESPN API may return games in different orders** between calls or at different times

### Evidence from Code

In `GameScoreOracle.sol`:

- `WEEK_RESULTS_SOURCE` (line 56): Sets bit `i` to 1 if home wins based on the **iteration index**
- `getWeekResults()` (line 821): Unpacks bit `i` as the winner for game at index `i`

In `Pickem.sol`:

- Line 401-413: Maps `winners[i]` to `contestMem.gameIds[i]` assuming they're in the same order

This explains the 5 incorrect game results - the games were in different positions in the ESPN response!

## Solution Approach

### Option A: Fix Oracle to Maintain Consistent Order (Recommended)

Modify the oracle's JavaScript source to:

1. Sort games by game ID in both `WEEK_GAMES_SOURCE` and `WEEK_RESULTS_SOURCE`
2. This ensures consistent ordering between calls

### Option B: Map by Game ID (More Complex)

Modify the oracle to:

1. Pack both game IDs and results together
2. Return a mapping structure instead of separate arrays

## Implementation Plan

### Phase 1: Fix the Oracle Contract

1. **Update `WEEK_GAMES_SOURCE`** to sort events by ID:
   ```javascript
   const e=(r.data?.events||[]).sort((a,b)=>a.id.localeCompare(b.id));
   ```

2. **Update `WEEK_RESULTS_SOURCE`** to sort events by ID:
   ```javascript
   const e=(r.data?.events||[]).sort((a,b)=>a.id.localeCompare(b.id));
   ```

3. **Deploy new oracle contract** with fixed sorting

### Phase 2: Update Existing System

1. **Call `setGameScoreOracle()`** on the Pickem contract to point to the new oracle
2. **Re-fetch week results** for Contest 0 using the new oracle
3. **Recalculate scores** for all participants

### Phase 3: Handle Existing Issues

Since Token ID 1 has already claimed incorrect winnings:

1. **Option 1**: Deploy compensation mechanism for affected users
2. **Option 2**: Create a new "corrected" contest with proper results

## Files to Modify

### `/solidity/contracts/src/GameScoreOracle.sol`

- Lines 38-49: Update `WEEK_GAMES_SOURCE` to add sorting
- Lines 51-65: Update `WEEK_RESULTS_SOURCE` to add sorting

### Deployment Steps

1. Update and test the oracle contract locally
2. Deploy new GameScoreOracle to Base chain
3. Call `pickem.setGameScoreOracle(newOracleAddress)`
4. Call `pickem.updateContestResults(0)` to refresh Contest 0

## Testing Requirements

1. Verify game ordering consistency between multiple API calls
2. Test with different weeks to ensure sorting works universally
3. Validate that recalculated scores match ESPN data

## Risk Mitigation

- The fix is backward compatible - old contests can be updated
- New oracle can coexist with old one during transition
- Sorting by game ID provides deterministic ordering

## Alternative Consideration

If we cannot update the existing Pickem contract's oracle, we would need to:

1. Deploy a new Pickem contract
2. Migrate users and recreate contests
3. This is more complex and not recommended