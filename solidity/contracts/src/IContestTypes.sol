// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IContestTypes {
    struct GameScore {
        uint256 id;
        uint8 homeQ1LastDigit;
        uint8 homeQ2LastDigit;
        uint8 homeQ3LastDigit;
        uint8 homeFLastDigit;
        uint8 awayQ1LastDigit;
        uint8 awayQ2LastDigit;
        uint8 awayQ3LastDigit;
        uint8 awayFLastDigit;
        uint8 qComplete;
        bool requestInProgress;
        bool gameCompleted; // true if the game is officially completed (from status.type.completed)
    }

    struct Contest {
        uint256 id;
        uint256 gameId;
        address creator;
        uint8[] rows;
        uint8[] cols;
        Cost boxCost;
        bool boxesCanBeClaimed;
        PayoutTracker payoutsPaid;
        uint256 totalRewards;
        uint256 boxesClaimed;
        uint256[] randomValues;
        bool randomValuesSet;
        string title;
        string description;
        address payoutStrategy;  // Address of the payout strategy contract
    }

    struct Cost {
        address currency;
        uint256 amount;
    }

    struct PayoutTracker {
        mapping(bytes32 => bool) payoutsMade;  // Track which specific payouts have been made
        uint256 totalPayoutsMade;              // Total number of payouts made
        uint256 totalAmountPaid;               // Total amount paid out
    }

    // Memory-safe version of PayoutTracker without mappings (for external functions)
    struct PayoutTrackerView {
        uint256 totalPayoutsMade;              // Total number of payouts made
        uint256 totalAmountPaid;               // Total amount paid out
    }

    // Memory-safe version of Contest without mappings (for external functions)
    struct ContestView {
        uint256 id;
        uint256 gameId;
        address creator;
        uint8[] rows;
        uint8[] cols;
        Cost boxCost;
        bool boxesCanBeClaimed;
        PayoutTrackerView payoutsPaid;
        uint256 totalRewards;
        uint256 boxesClaimed;
        uint256[] randomValues;
        bool randomValuesSet;
        string title;
        string description;
        address payoutStrategy;  // Address of the payout strategy contract
    }

    struct BoxCost {
        address currency;
        uint256 amount;
    }
}
