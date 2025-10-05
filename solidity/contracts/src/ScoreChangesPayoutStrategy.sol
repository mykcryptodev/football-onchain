// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IPayoutStrategy} from "./IPayoutStrategy.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";

/**
 * @title ScoreChangesPayoutStrategy
 * @dev Implements a payout strategy that pays out on both score changes and quarters
 *
 * Total Pot Distribution:
 * - 50% for Score Changes: Divided evenly among all score change winners
 * - 50% for Quarters:
 *   - Q1: 7.5% (15% of the 50% quarter allocation)
 *   - Q2: 10%  (20% of the 50% quarter allocation)
 *   - Q3: 7.5% (15% of the 50% quarter allocation)
 *   - Q4: 25%  (50% of the 50% quarter allocation)
 *
 * IMPORTANT: This strategy requires the game to be completely finished before
 * any payouts can be processed. This ensures fair distribution of score change
 * payouts since we need to know the total number of score changes.
 *
 * Note: If a box wins both a quarter and a score change, they get both payouts
 */
contract ScoreChangesPayoutStrategy is IPayoutStrategy {
    // Split: 50% for score changes, 50% for quarters
    uint256 public constant SCORE_CHANGES_ALLOCATION_BPS = 500;  // 50%
    uint256 public constant QUARTERS_ALLOCATION_BPS = 500;       // 50%

    // Quarter payout percentages within the quarter allocation (basis points)
    uint256 public constant Q1_QUARTER_BPS = 150;  // 15% of quarter allocation = 7.5% of total
    uint256 public constant Q2_QUARTER_BPS = 200;  // 20% of quarter allocation = 10% of total
    uint256 public constant Q3_QUARTER_BPS = 150;  // 15% of quarter allocation = 7.5% of total
    uint256 public constant Q4_QUARTER_BPS = 500;  // 50% of quarter allocation = 25% of total

    uint256 public constant BASIS_POINTS_DENOMINATOR = 1000;

    /**
     * @dev Calculate payouts for both score changes and quarters
     * Note: This function should only be called when the game is completely finished
     * (qComplete >= 100) to ensure fair score change payout calculation
     */
    function calculatePayouts(
        uint256 contestId,
        uint256 gameId,
        uint256 totalPot,
        GameScoreOracle gameScoreOracle,
        function(uint256, uint256, uint256) external view returns (address) getBoxOwner
    ) external view override returns (PayoutInfo[] memory payouts) {
        // Get game scores and score changes from oracle
        (
            uint8 homeQ1LastDigit,
            uint8 homeQ2LastDigit,
            uint8 homeQ3LastDigit,
            uint8 homeFLastDigit,
            uint8 awayQ1LastDigit,
            uint8 awayQ2LastDigit,
            uint8 awayQ3LastDigit,
            uint8 awayFLastDigit,
            uint8 qComplete,

        ) = gameScoreOracle.getGameScores(gameId);

        GameScoreOracle.ScoreChangeEvent[] memory scoreChanges = gameScoreOracle.getScoreChanges(gameId);

        // Calculate total payouts needed
        uint256 quarterPayouts = 0;
        if (qComplete >= 1) quarterPayouts++;
        if (qComplete >= 2) quarterPayouts++;
        if (qComplete >= 3) quarterPayouts++;
        if (qComplete >= 100) quarterPayouts++;

        uint256 totalPayouts = quarterPayouts + scoreChanges.length;
        payouts = new PayoutInfo[](totalPayouts);
        uint256 currentIndex = 0;

        // Calculate score change payouts (50% of pot divided evenly)
        if (scoreChanges.length > 0) {
            uint256 scoreChangeAllocation = (totalPot * SCORE_CHANGES_ALLOCATION_BPS) / BASIS_POINTS_DENOMINATOR;
            uint256 perScoreChangePayout = scoreChangeAllocation / scoreChanges.length;

            for (uint256 i = 0; i < scoreChanges.length; i++) {
                GameScoreOracle.ScoreChangeEvent memory change = scoreChanges[i];
                address winner = getBoxOwner(contestId, change.awayLastDigit, change.homeLastDigit);

                payouts[currentIndex] = PayoutInfo({
                    winner: winner,
                    amount: perScoreChangePayout,
                    reason: string(abi.encodePacked("Score Change #", _toString(i + 1))),
                    quarter: 0, // Score changes are not quarter-specific
                    eventIndex: i
                });
                currentIndex++;
            }
        }

        // Calculate quarter payouts (50% of pot allocated by percentages)
        uint256 quarterAllocation = (totalPot * QUARTERS_ALLOCATION_BPS) / BASIS_POINTS_DENOMINATOR;

        // Q1 Payout
        if (qComplete >= 1) {
            address q1Winner = getBoxOwner(contestId, awayQ1LastDigit, homeQ1LastDigit);
            payouts[currentIndex] = PayoutInfo({
                winner: q1Winner,
                amount: (quarterAllocation * Q1_QUARTER_BPS) / BASIS_POINTS_DENOMINATOR,
                reason: "Q1 Winner",
                quarter: 1,
                eventIndex: 0
            });
            currentIndex++;
        }

        // Q2 Payout
        if (qComplete >= 2) {
            address q2Winner = getBoxOwner(contestId, awayQ2LastDigit, homeQ2LastDigit);
            payouts[currentIndex] = PayoutInfo({
                winner: q2Winner,
                amount: (quarterAllocation * Q2_QUARTER_BPS) / BASIS_POINTS_DENOMINATOR,
                reason: "Q2 Winner",
                quarter: 2,
                eventIndex: 0
            });
            currentIndex++;
        }

        // Q3 Payout
        if (qComplete >= 3) {
            address q3Winner = getBoxOwner(contestId, awayQ3LastDigit, homeQ3LastDigit);
            payouts[currentIndex] = PayoutInfo({
                winner: q3Winner,
                amount: (quarterAllocation * Q3_QUARTER_BPS) / BASIS_POINTS_DENOMINATOR,
                reason: "Q3 Winner",
                quarter: 3,
                eventIndex: 0
            });
            currentIndex++;
        }

        // Final Payout (Q4)
        if (qComplete >= 100) {
            address finalWinner = getBoxOwner(contestId, awayFLastDigit, homeFLastDigit);
            payouts[currentIndex] = PayoutInfo({
                winner: finalWinner,
                amount: (quarterAllocation * Q4_QUARTER_BPS) / BASIS_POINTS_DENOMINATOR,
                reason: "Final Winner",
                quarter: 4,
                eventIndex: 0
            });
        }

        return payouts;
    }

    /**
     * @dev Get the human-readable name of this payout strategy
     */
    function getStrategyName() external pure override returns (string memory) {
        return "Score Changes + Quarters";
    }

    /**
     * @dev Get the type identifier for this payout strategy
     */
    function getStrategyType() external pure override returns (bytes32) {
        return keccak256("SCORE_CHANGES_QUARTERS");
    }

    /**
     * @dev This strategy requires score change data
     */
    function requiresScoreChanges() external pure override returns (bool) {
        return true;
    }

    /**
     * @dev Validate that the game state is ready for payout calculation
     * For score changes strategy, we require the game to be completely finished
     * to ensure we know the total number of score changes for fair distribution
     */
    function validateGameState(
        uint256 gameId,
        GameScoreOracle gameScoreOracle
    ) external view override returns (bool isValid, string memory reason) {
        (,,,,,,,, , bool requestInProgress) = gameScoreOracle.getGameScores(gameId);

        if (requestInProgress) {
            return (false, "Oracle request in progress");
        }

        // For score changes strategy, require game to be officially completed
        // This ensures we know the total number of score changes for fair payout calculation
        bool gameCompleted = gameScoreOracle.isGameCompleted(gameId);
        if (!gameCompleted) {
            return (false, "Game must be officially completed for score change payouts");
        }

        // Check if we have score change data
        uint8 scoreChangeCount = gameScoreOracle.getTotalScoreChanges(gameId);
        if (scoreChangeCount == 0) {
            return (false, "No score changes recorded yet");
        }

        return (true, "");
    }

    /**
     * @dev Get the allocation percentages for this strategy
     * @return scoreChangesAllocation Percentage allocated to score changes (in BPS)
     * @return quartersAllocation Percentage allocated to quarters (in BPS)
     */
    function getAllocationPercentages() external pure returns (uint256 scoreChangesAllocation, uint256 quartersAllocation) {
        return (SCORE_CHANGES_ALLOCATION_BPS, QUARTERS_ALLOCATION_BPS);
    }

    /**
     * @dev Get the payout percentage for a specific quarter within the quarter allocation
     * @param quarter The quarter (1-4)
     * @return bps The payout percentage in basis points (within the quarter allocation)
     */
    function getQuarterPayoutBps(uint8 quarter) external pure returns (uint256 bps) {
        if (quarter == 1) return Q1_QUARTER_BPS;
        if (quarter == 2) return Q2_QUARTER_BPS;
        if (quarter == 3) return Q3_QUARTER_BPS;
        if (quarter == 4) return Q4_QUARTER_BPS;
        return 0;
    }

    /**
     * @dev Convert a uint256 to string (simple implementation for small numbers)
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
