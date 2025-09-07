// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

interface IContests {
    function fulfillRandomNumbers(uint256 contestId, uint8[] memory rows, uint8[] memory cols) external;
}

contract RandomNumbers is VRFV2PlusWrapperConsumerBase, ConfirmedOwner {
    // Default scores array
    uint8[] private defaultScores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // VRF configuration
    uint256 public vrfFee = 0.001 ether;
    uint32 public vrfGas = 250_000;

    // Contests contract reference
    IContests public contests;

    // Mapping to track VRF requests
    mapping(uint256 requestId => uint256 contestId) private vrfRequests;

    error InsufficientPayment();
    error OnlyContests();
    error FailedToSendETH();
    event RandomNumberRequested(uint256 indexed contestId, uint256 indexed requestId);

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

    function setVrfConfig(uint256 _fee, uint32 _gas) external onlyOwner {
        vrfFee = _fee;
        vrfGas = _gas;
    }

    function requestRandomNumbers(uint256 contestId) external payable virtual onlyContests {
        if (msg.value < vrfFee) revert InsufficientPayment();

        uint256 requestId;
        uint256 reqPrice;
        
        (requestId, reqPrice) = requestRandomnessPayInNative(
            vrfGas,
            3, // requestConfirmations
            2, // numWords
            VRFV2PlusClient._argsToBytes(
              VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
            )
        );

        vrfRequests[requestId] = contestId;
        emit RandomNumberRequested(contestId, requestId);
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

    // allow the owner to withdraw funds
    function withdraw() external onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        if (!sent) revert FailedToSendETH();
    }
}
