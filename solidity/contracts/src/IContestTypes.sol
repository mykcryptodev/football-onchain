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
    }

    struct Contest {
        uint256 id;
        uint256 gameId;
        address creator;
        uint8[] rows;
        uint8[] cols;
        Cost boxCost;
        bool boxesCanBeClaimed;
        RewardPayment rewardsPaid;
        uint256 totalRewards;
        uint256 boxesClaimed;
        uint256[] randomValues;
        bool randomValuesSet;
    }

    struct Cost {
        address currency;
        uint256 amount;
    }

    struct RewardPayment {
        bool q1Paid;
        bool q2Paid;
        bool q3Paid;
        bool finalPaid;
    }

    struct BoxCost {
        address currency;
        uint256 amount;
    }
}
