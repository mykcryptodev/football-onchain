// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {DummyLINK} from "./DummyLINK.sol";

contract DummyVRF {
    DummyLINK public linkToken;

    constructor() {
        linkToken = new DummyLINK();
    }

    function link() public view returns (address) {
        return address(linkToken);
    }

    function createSubscription() external pure returns (uint64) {
        return 1; // Always return subscription ID 1 for simplicity
    }

    function fundSubscription(uint64 subId, uint96 amount) external {
        // Do nothing, just a dummy function
    }

    function addConsumer(uint64 subId, address consumer) external {
        // Do nothing, just a dummy function
    }

    // Add this function to your DummyVRF contract
    function calculateRequestPriceNative(
        uint32, /* callbackGasLimit */
        uint16 /* requestConfirmations */
    ) external pure returns (uint256) {
        return 0.001 ether; // For testing, we return a fixed cost
    }

    // solhint-disable-next-line no-unused-vars
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external pure returns (uint256 requestId) {
        // bytes32 to uint256 conversion
        requestId = uint256(keyHash);
        return requestId + subId + minimumRequestConfirmations + callbackGasLimit + numWords;
    }

    function fulfillRandomWords(uint256 requestId, address consumer) external {
        // This function would be called to simulate fulfillment of the random words request
    }
}
