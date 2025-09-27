// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IPayoutStrategy} from "./IPayoutStrategy.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";

/**
 * @title QuartersOnlyPayoutStrategy
 * @dev Implements a payout strategy that only pays out at the end of each quarter
 *
 * Payout Distribution:
 * - Q1: 15% of total pot
 * - Q2: 20% of total pot
 * - Q3: 15% of total pot
 * - Q4: 50% of total pot
 */
contract QuartersOnlyPayoutStrategy is IPayoutStrategy {
    // Payout percentages (in basis points, where 1000 = 100%)
    uint256 public constant Q1_PAYOUT_BPS = 150;  // 15%
    uint256 public constant Q2_PAYOUT_BPS = 200;  // 20%
    uint256 public constant Q3_PAYOUT_BPS = 150;  // 15%
    uint256 public constant Q4_PAYOUT_BPS = 500;  // 50%
    uint256 public constant BASIS_POINTS_DENOMINATOR = 1000;

    /**
     * @dev Calculate payouts for quarters only
     */
    function calculatePayouts(
        uint256 contestId,
        uint256 gameId,
        uint256 totalPot,
        GameScoreOracle gameScoreOracle,
        function(uint256, uint256, uint256) external view returns (address) getBoxOwner
    ) external view override returns (PayoutInfo[] memory payouts) {
        // Get qComplete first to determine array size
        (,,,,,,,, uint8 qComplete,) = gameScoreOracle.getGameScores(gameId);

        // Count how many quarters are complete to determine payout array size
        uint8 payoutCount = 0;
        if (qComplete >= 1) payoutCount++;
        if (qComplete >= 2) payoutCount++;
        if (qComplete >= 3) payoutCount++;
        if (qComplete >= 100) payoutCount++; // Final score available

        payouts = new PayoutInfo[](payoutCount);
        uint8 currentIndex = 0;

        // Get all scores at once for efficient processing
        (
            uint8 homeQ1LastDigit,
            uint8 homeQ2LastDigit,
            uint8 homeQ3LastDigit,
            uint8 homeFLastDigit,
            uint8 awayQ1LastDigit,
            uint8 awayQ2LastDigit,
            uint8 awayQ3LastDigit,
            uint8 awayFLastDigit,,
        ) = gameScoreOracle.getGameScores(gameId);

        // Process payouts by quarter
        currentIndex = _processQuarterPayout(payouts, currentIndex, contestId, getBoxOwner, totalPot, 1, qComplete, awayQ1LastDigit, homeQ1LastDigit, Q1_PAYOUT_BPS, "Q1 Winner");
        currentIndex = _processQuarterPayout(payouts, currentIndex, contestId, getBoxOwner, totalPot, 2, qComplete, awayQ2LastDigit, homeQ2LastDigit, Q2_PAYOUT_BPS, "Q2 Winner");
        currentIndex = _processQuarterPayout(payouts, currentIndex, contestId, getBoxOwner, totalPot, 3, qComplete, awayQ3LastDigit, homeQ3LastDigit, Q3_PAYOUT_BPS, "Q3 Winner");
        _processQuarterPayout(payouts, currentIndex, contestId, getBoxOwner, totalPot, 4, qComplete, awayFLastDigit, homeFLastDigit, Q4_PAYOUT_BPS, "Final Winner");

        return payouts;
    }

    /**
     * @dev Helper function to process a single quarter payout
     */
    function _processQuarterPayout(
        PayoutInfo[] memory payouts,
        uint8 currentIndex,
        uint256 contestId,
        function(uint256, uint256, uint256) external view returns (address) getBoxOwner,
        uint256 totalPot,
        uint8 quarter,
        uint8 qComplete,
        uint8 awayLastDigit,
        uint8 homeLastDigit,
        uint256 payoutBps,
        string memory reason
    ) internal view returns (uint8) {
        bool shouldPayout = (quarter < 4 && qComplete >= quarter) || (quarter == 4 && qComplete >= 100);

        if (shouldPayout && currentIndex < payouts.length) {
            address winner = getBoxOwner(contestId, awayLastDigit, homeLastDigit);
            payouts[currentIndex] = PayoutInfo({
                winner: winner,
                amount: (totalPot * payoutBps) / BASIS_POINTS_DENOMINATOR,
                reason: reason,
                quarter: quarter,
                eventIndex: 0
            });
            return currentIndex + 1;
        }

        return currentIndex;
    }

    /**
     * @dev Get the human-readable name of this payout strategy
     */
    function getStrategyName() external pure override returns (string memory) {
        return "Quarters Only";
    }

    /**
     * @dev Get the type identifier for this payout strategy
     */
    function getStrategyType() external pure override returns (bytes32) {
        return keccak256("QUARTERS_ONLY");
    }

    /**
     * @dev This strategy does not require score change data
     */
    function requiresScoreChanges() external pure override returns (bool) {
        return false;
    }

    /**
     * @dev Validate that the game state is ready for payout calculation
     */
    function validateGameState(
        uint256 gameId,
        GameScoreOracle gameScoreOracle
    ) external view override returns (bool isValid, string memory reason) {
        (,,,,,,,, uint8 qComplete, bool requestInProgress) = gameScoreOracle.getGameScores(gameId);

        if (requestInProgress) {
            return (false, "Oracle request in progress");
        }

        if (qComplete == 0) {
            return (false, "No quarters completed yet");
        }

        return (true, "");
    }

    /**
     * @dev Get the payout percentage for a specific quarter
     * @param quarter The quarter (1-4)
     * @return bps The payout percentage in basis points
     */
    function getQuarterPayoutBps(uint8 quarter) external pure returns (uint256 bps) {
        if (quarter == 1) return Q1_PAYOUT_BPS;
        if (quarter == 2) return Q2_PAYOUT_BPS;
        if (quarter == 3) return Q3_PAYOUT_BPS;
        if (quarter == 4) return Q4_PAYOUT_BPS;
        return 0;
    }
}
