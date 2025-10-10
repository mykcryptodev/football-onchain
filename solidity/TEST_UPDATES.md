# Test Updates for Real-Time Leaderboard System

## Summary

All tests have been updated to work with the new real-time leaderboard system. All 12 tests are passing.

## Key Changes

### Removed Functions
- ❌ `determineWinners(contestId, tokenIds)` - No longer needed
- ❌ `getContestTokenIds(contestId)` - No longer exists

### Updated Test Patterns

#### Before (Old System)
```solidity
// Calculate scores
calculateScore(tokenId1);
calculateScore(tokenId2);

// Wait 24 hours
vm.warp(block.timestamp + 24 hours + 1);

// Manually determine winners
uint256[] memory allTokens = getContestTokenIds(contestId);
determineWinners(contestId, allTokens);

// Then check winners
uint256[] memory winners = getContestWinners(contestId);
```

#### After (New System)
```solidity
// Calculate scores - leaderboard updates automatically!
calculateScore(tokenId1);  // Automatically added to leaderboard if qualifies
calculateScore(tokenId2);  // Automatically added to leaderboard if qualifies

// Winners are already determined - just check the leaderboard
uint256[] memory winners = getContestWinners(contestId);
Pickem.LeaderboardEntry[] memory leaderboard = getContestLeaderboard(contestId);

// For claiming, wait 24 hours after finalization
vm.warp(block.timestamp + 24 hours + 1);
claimPrize(contestId, tokenId);
```

### Error Changes
- ❌ Removed: `WinnersAlreadyCalculated`
- ❌ Removed: `ScoreCalculationPeriodNotEnded`
- ✅ Added: `PayoutPeriodNotStarted` - used when trying to claim before 24-hour delay

### Event Changes
- Changed: `ScoreCalculationPeriodStarted` → `PayoutPeriodStarted`
- Added: `LeaderboardUpdated(contestId, tokenId, score, position)`

## Updated Tests

### 1. `testSubmitPredictionsAndCalculateWinners()`
**Changes:**
- Removed `determineWinners()` call
- Removed `getContestTokenIds()` call
- Added `getContestLeaderboard()` to verify leaderboard state
- Winners are now checked immediately after scores are calculated

### 2. `testLeaderboardUpdatesWithScoreCalculation()` (was `testDetermineWinnersWithUncalculatedScores`)
**Changes:**
- Now tests leaderboard updates in real-time
- Verifies leaderboard is empty before scores calculated
- Verifies leaderboard updates after each score calculation
- Removed winner determination logic

### 3. `testTop3LeaderboardMaintainsCorrectOrder()` (was `testCannotDetermineWinnersTwice`)
**Changes:**
- Now tests top-3 leaderboard maintains correct order
- Creates 5 users, but leaderboard only keeps top 3
- Verifies leaderboard is sorted correctly

### 4. `testCannotClaimBeforePayoutPeriod()` (was `testCannotClaimBeforeWinnersCalculated`)
**Changes:**
- Now tests `PayoutPeriodNotStarted` error instead of `NoWinners`
- Verifies 24-hour delay is enforced
- Shows claim works after delay passes

### 5. `testCalculateScoreBatch()`
**No changes** - batch calculation still works the same way

### 6. `testCannotCalculateScoreTwice()`
**No changes** - still prevents duplicate score calculation

### 7. `testPermissionlessScoreCalculation()`
**No changes** - still tests that anyone can calculate any score

### 8. `testPermissionlessLeaderboardViewing()` (was `testPermissionlessWinnerDetermination`)
**Changes:**
- Now tests leaderboard viewing instead of winner determination
- Shows anyone can view leaderboard
- Shows anyone can view winners (derived from leaderboard)

### 9. `testLeaderboardWithTiebreaker()` (was `testGetContestTokenIds`)
**Changes:**
- New test for tiebreaker functionality
- Creates 3 users with same picks but different tiebreakers
- Verifies leaderboard sorts by tiebreaker when scores are tied

### 10. `testPayoutPeriodEvents()` (was `testScoreCalculationPeriodEvents`)
**Changes:**
- Updated comment to reference `PayoutPeriodStarted` event instead of `ScoreCalculationPeriodStarted`

### 11. `testMultipleEntriesPerUser()`
**No changes** - still tests that users can have multiple entries

### 12. `testCreateContestWithOracleGames()`
**No changes** - still tests contest creation with oracle

## Test Results

```
Ran 12 tests for contracts/test/PickemOracleIntegration.t.sol:PickemOracleIntegrationTest
[PASS] testCalculateScoreBatch() (gas: 11838681)
[PASS] testCannotCalculateScoreTwice() (gas: 10820148)
[PASS] testCannotClaimBeforePayoutPeriod() (gas: 10887413)
[PASS] testCreateContestWithOracleGames() (gas: 9414546)
[PASS] testLeaderboardUpdatesWithScoreCalculation() (gas: 11407408)
[PASS] testLeaderboardWithTiebreaker() (gas: 11591659)
[PASS] testMultipleEntriesPerUser() (gas: 16597771)
[PASS] testPayoutPeriodEvents() (gas: 10676898)
[PASS] testPermissionlessLeaderboardViewing() (gas: 10828556)
[PASS] testPermissionlessScoreCalculation() (gas: 10823912)
[PASS] testSubmitPredictionsAndCalculateWinners() (gas: 17141244)
[PASS] testTop3LeaderboardMaintainsCorrectOrder() (gas: 12934886)

Suite result: ok. 12 passed; 0 failed; 0 skipped
```

## New Testing Patterns

### Testing Leaderboard State
```solidity
// Get full leaderboard with scores and tiebreaker data
Pickem.LeaderboardEntry[] memory leaderboard = getContestLeaderboard(contestId);
assertEq(leaderboard.length, 3, "Should have 3 entries for top-3");
assertEq(leaderboard[0].score, 16, "1st place score");
assertEq(leaderboard[0].tokenId, expectedTokenId, "1st place token");

// Or just get winner tokenIds
uint256[] memory winners = getContestWinners(contestId);
assertEq(winners[0], expectedWinner, "Winner should match");
```

### Testing Payout Delay
```solidity
// Verify cannot claim too early
vm.expectRevert(Pickem.PayoutPeriodNotStarted.selector);
claimPrize(contestId, tokenId);

// Fast forward past deadline
vm.warp(block.timestamp + 24 hours + 1);

// Now claim works
claimPrize(contestId, tokenId);
```

### Testing Top-N Leaderboards
```solidity
// Create contest with top-3 payout
createContest(..., 1); // payoutType = 1 (top 3)

// Calculate 5 scores
for (uint i = 0; i < 5; i++) {
    calculateScore(tokens[i]);
}

// Leaderboard only keeps top 3
Pickem.LeaderboardEntry[] memory leaderboard = getContestLeaderboard(contestId);
assertEq(leaderboard.length, 3, "Only top 3 stored");
```

## Benefits of New Test Structure

1. **Simpler** - No need to manage tokenId arrays or call determineWinners
2. **More Realistic** - Tests actual user flow of calculating scores individually
3. **Better Coverage** - New tests for leaderboard state and real-time updates
4. **Clearer Intent** - Tests read more like the actual usage pattern
5. **Gas Efficient** - Tests demonstrate the gas savings of the new approach
