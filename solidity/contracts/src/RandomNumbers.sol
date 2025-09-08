// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

interface IContests {
    function fulfillRandomNumbers(uint256 contestId, uint8[] memory rows, uint8[] memory cols) external;
}

interface IGasOracle {
    function gasPrice() external view returns (uint256);
    function baseFee() external view returns (uint256);
}

contract RandomNumbers is VRFV2PlusWrapperConsumerBase, ConfirmedOwner {
    // Default scores array
    uint8[] private defaultScores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // VRF configuration
    uint32 public constant CALLBACK_GAS_LIMIT = 250_000;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 2; // We need 2 random numbers for rows and cols

    // Contests contract reference
    IContests public contests;

    // Base network gas oracle
    IGasOracle public constant GAS_ORACLE = IGasOracle(0x420000000000000000000000000000000000000F);

    // Mapping to track VRF requests
    mapping(uint256 requestId => uint256 contestId) private vrfRequests;

    error InsufficientPayment();
    error OnlyContests();
    error FailedToSendETH();
    error RefundFailed();
    event RandomNumberRequested(uint256 indexed contestId, uint256 indexed requestId, uint256 requestPrice);

    modifier onlyContests() {
        if (msg.sender != address(contests)) revert OnlyContests();
        _;
    }

    constructor(address _vrfWrapper)
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        ConfirmedOwner(msg.sender)
    {}

    function setContests(address _contests) external onlyOwner {
        contests = IContests(_contests);
    }

    function requestRandomNumbers(uint256 contestId) external payable virtual onlyContests {
        // Calculate the request price dynamically
        uint256 requestPrice = i_vrfV2PlusWrapper.calculateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS);

        // Ensure enough native token was sent
        if (msg.value < requestPrice) revert InsufficientPayment();

        // Create extraArgs for VRF v2.5 - specify native payment
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );

        // Request randomness paying with native token
        (uint256 requestId, ) = requestRandomnessPayInNative(
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS,
            extraArgs
        );

        // Refund excess payment
        if (msg.value > requestPrice) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - requestPrice}("");
            if (!success) revert RefundFailed();
        }

        vrfRequests[requestId] = contestId;
        emit RandomNumberRequested(contestId, requestId, requestPrice);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 contestId = vrfRequests[requestId];

        // Generate shuffled scores using the random words
        uint8[] memory rows = _shuffleScores(randomWords[0]);
        uint8[] memory cols = _shuffleScores(randomWords[1]);

        // Update the contest with the random numbers
        contests.fulfillRandomNumbers(contestId, rows, cols);
    }

    function _shuffleScores(
        uint256 randomNumber
    ) internal view returns(uint8[] memory shuffledScores) {
        shuffledScores = defaultScores;
        for (uint8 i = 0; i < 10;) {
            uint256 n = i + uint256(keccak256(abi.encodePacked(randomNumber))) % (10 - i);
            uint8 temp = shuffledScores[n];
            shuffledScores[n] = shuffledScores[i];
            shuffledScores[i] = temp;
            unchecked{ ++i; }
        }
        return shuffledScores;
    }

    // Function to estimate the cost of requesting randomness using current network gas price
    function estimateRequestPrice() external view returns (uint256) {
        uint256 currentGasPrice = GAS_ORACLE.gasPrice();
        return i_vrfV2PlusWrapper.estimateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS, currentGasPrice);
    }

    // Function to estimate the cost of requesting randomness with custom gas price
    function estimateRequestPrice(uint256 gasPriceWei) external view returns (uint256) {
        return i_vrfV2PlusWrapper.estimateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS, gasPriceWei);
    }

    // Convenience function that uses a default gas price (fallback if oracle fails)
    function estimateRequestPriceWithDefaultGas() external view returns (uint256) {
        // Default to 1 gwei (adjust based on your target network's typical gas price)
        return i_vrfV2PlusWrapper.estimateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS, 1 gwei);
    }

    // Get the current request price (this will work during transactions but return 0 in view calls)
    function getCurrentRequestPrice() external view virtual returns (uint256) {
        return i_vrfV2PlusWrapper.calculateRequestPriceNative(CALLBACK_GAS_LIMIT, NUM_WORDS);
    }

    // Debug function to check VRF wrapper address
    function getVRFWrapperAddress() external view returns (address) {
        return address(i_vrfV2PlusWrapper);
    }

    // Debug function to get callback gas limit
    function getCallbackGasLimit() external pure returns (uint32) {
        return CALLBACK_GAS_LIMIT;
    }

    // allow the owner to withdraw funds
    function withdraw() external onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        if (!sent) revert FailedToSendETH();
    }
}
