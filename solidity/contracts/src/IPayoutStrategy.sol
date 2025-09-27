// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {GameScoreOracle} from "./GameScoreOracle.sol";

interface IPayoutStrategy {
    /**
     * @dev Struct representing a single payout to a winner
     */
    struct PayoutInfo {
        address winner;      // The address that should receive the payout
        uint256 amount;      // The amount to be paid out (in wei or token units)
        string reason;       // Human-readable reason for the payout (e.g., "Q1 Winner", "Score Change #3")
        uint8 quarter;       // The quarter this payout is for (1-4, 0 for non-quarter specific)
        uint256 eventIndex;  // Index of the event that triggered this payout (for score changes)
    }

    /**
     * @dev Calculate all payouts for a given contest
     * @param contestId The ID of the contest
     * @param gameId The ID of the game this contest is tied to
     * @param totalPot The total amount available for payouts (after treasury fee)
     * @param gameScoreOracle The oracle contract to read game data from
     * @param getBoxOwner Function to get the owner of a box given row/col scores
     * @return payouts Array of all payouts that should be made
     */
    function calculatePayouts(
        uint256 contestId,
        uint256 gameId,
        uint256 totalPot,
        GameScoreOracle gameScoreOracle,
        function(uint256, uint256, uint256) external view returns (address) getBoxOwner
    ) external view returns (PayoutInfo[] memory payouts);

    /**
     * @dev Get the human-readable name of this payout strategy
     * @return name The name of the strategy (e.g., "Score Changes + Quarters", "Quarters Only")
     */
    function getStrategyName() external pure returns (string memory name);

    /**
     * @dev Get the type identifier for this payout strategy
     * @return strategyType A unique identifier for this strategy type
     */
    function getStrategyType() external pure returns (bytes32 strategyType);

    /**
     * @dev Check if this strategy requires score change data
     * @return requiresScoreChanges True if the strategy needs score change data from the oracle
     */
    function requiresScoreChanges() external pure returns (bool requiresScoreChanges);

    /**
     * @dev Validate that the game state is ready for payout calculation
     * @param gameId The game ID to validate
     * @param gameScoreOracle The oracle contract to read game data from
     * @return isValid True if the game state is valid for payout calculation
     * @return reason Human-readable reason if validation fails
     *
     * Note: Different strategies may have different requirements:
     * - QuartersOnlyPayoutStrategy: Can pay out as quarters complete
     * - ScoreChangesPayoutStrategy: Requires game to be finished for fair score change distribution
     */
    function validateGameState(
        uint256 gameId,
        GameScoreOracle gameScoreOracle
    ) external view returns (bool isValid, string memory reason);
}
