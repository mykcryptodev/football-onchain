// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

/// @notice The Chainlink Functions v1.0.0 Commitment layout (FunctionsResponse.Commitment).
/// The router stores keccak256(abi.encode(commitment)) per request; timeoutRequests
/// re-verifies the hash, so every field must match what was stored at request time.
/// IMPORTANT: the router hashes with ITS OWN s_config.adminFee (= 0 on Base mainnet),
/// not the adminFee emitted in the coordinator's OracleRequest event.
struct Commitment {
    bytes32 requestId;
    address coordinator;
    uint96 estimatedTotalCostJuels;
    address client;
    uint64 subscriptionId;
    uint32 callbackGasLimit;
    uint72 adminFee;
    uint72 donFee;
    uint40 gasOverheadBeforeCallback;
    uint40 gasOverheadAfterCallback;
    uint32 timeoutTimestamp;
}

interface IFunctionsRouterCancel {
    function timeoutRequests(Commitment[] calldata requestsToTimeoutByCommitment) external;
    function cancelSubscription(uint64 subscriptionId, address to) external;
    function pendingRequestExists(uint64 subscriptionId) external view returns (bool);
}

interface IERC20Balance {
    function balanceOf(address account) external view returns (uint256);
}

/// @title CancelCLFSubscription
/// @notice Reclaims the LINK balance of Chainlink Functions subscription #6 (Base mainnet).
///
/// Chainlink Functions was sunset (Base mainnet DON dark since ~June 2026), so 5 requests
/// from 2026-08-24/25 never fulfilled and block cancelSubscription with
/// CannotRemoveWithPendingRequests. This script first times them out via the permissionless
/// timeoutRequests() (all are past their timeoutTimestamp), then cancels the subscription,
/// sending the remaining LINK to the broadcaster (or RECIPIENT if set).
///
/// The 5 pending commitments below were recovered from the coordinator's OracleRequest
/// events (coordinator 0xd93d7778…), with adminFee corrected to the router's own config
/// value of 0. Each was verified against the router's on-chain commitment hash.
///
/// Usage (dry run):
///   SENDER=0x9036464e4ecd2d40d21ee38a0398aedd6805a09b forge script script/CancelCLFSubscription.s.sol --rpc-url https://mainnet.base.org -vvv
/// Usage (real run, from the subscription owner's key):
///   PRIVATE_KEY=0x... forge script script/CancelCLFSubscription.s.sol --rpc-url https://mainnet.base.org --broadcast -vvv
/// or: make cancel-clf-subscription PRIVATE_KEY=0x...
contract CancelCLFSubscription is Script {
    // Chainlink Functions Router (Base mainnet)
    IFunctionsRouterCancel constant ROUTER = IFunctionsRouterCancel(0xf9B8fc078197181C841c296C876945aaa425B278);
    // LINK token (Base mainnet)
    IERC20Balance constant LINK = IERC20Balance(0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196);
    // Coordinator that serviced these requests (Base mainnet)
    address constant COORDINATOR = 0xd93d77789129c584a02B9Fd3BfBA560B2511Ff8A;
    // Old GameScoreOracle (consumer with 2 pending requests)
    address constant ORACLE = 0x03C36C1a2c954B3FdA9D767213BA812577cB5878;
    // Second consumer owned by the sub owner (3 pending requests)
    address constant CONSUMER2 = 0x318C6FD8fCc66D3a9B24325CB1912a717A6Da6cf;

    uint64 constant SUBSCRIPTION_ID = 6;

    function run() external {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        address sender;
        if (pk != 0) {
            sender = vm.addr(pk);
            vm.startBroadcast(pk);
        } else {
            // fork-simulation path: prank SENDER (no key needed)
            sender = vm.envAddress("SENDER");
            vm.startBroadcast(sender);
        }

        address recipient = vm.envOr("RECIPIENT", sender);

        Commitment[] memory pending = _pendingCommitments();

        console.log("Subscription:", SUBSCRIPTION_ID);
        console.log("Sender:", sender);
        console.log("Recipient:", recipient);
        console.log("LINK before:", LINK.balanceOf(recipient));

        // Time out each pending request individually so an already-cleared one
        // (fulfilled/timed out between now and execution) can't block the rest.
        for (uint256 i = 0; i < pending.length; ++i) {
            Commitment[] memory single = new Commitment[](1);
            single[0] = pending[i];
            try ROUTER.timeoutRequests(single) {
                console.log("timed out request:");
                console.logBytes32(pending[i].requestId);
            } catch {
                console.log("already cleared (skipped):");
                console.logBytes32(pending[i].requestId);
            }
        }

        require(!ROUTER.pendingRequestExists(SUBSCRIPTION_ID), "still has pending requests");

        ROUTER.cancelSubscription(SUBSCRIPTION_ID, recipient);
        console.log("subscription cancelled");
        console.log("LINK after:", LINK.balanceOf(recipient));

        vm.stopBroadcast();
    }

    function _pendingCommitments() internal pure returns (Commitment[] memory c) {
        c = new Commitment[](5);

        // Oracle 0x03C3… (contest-82 game-score requests), 2026-08-25
        c[0] = Commitment({
            requestId: 0xfa24f051e85bd29bbc20db5d3d67c49a288d45d8978db10e02ab98bbbaf38b62,
            coordinator: COORDINATOR,
            estimatedTotalCostJuels: 556916570607749310,
            client: ORACLE,
            subscriptionId: SUBSCRIPTION_ID,
            callbackGasLimit: 300000,
            adminFee: 0,
            donFee: 0,
            gasOverheadBeforeCallback: 163500,
            gasOverheadAfterCallback: 57000,
            timeoutTimestamp: 1787622647
        });
        c[1] = Commitment({
            requestId: 0xba3fb863b1100ebc1212d21969e318c75a60300671063baf3faa4f426142eae6,
            coordinator: COORDINATOR,
            estimatedTotalCostJuels: 554152010296169105,
            client: ORACLE,
            subscriptionId: SUBSCRIPTION_ID,
            callbackGasLimit: 300000,
            adminFee: 0,
            donFee: 0,
            gasOverheadBeforeCallback: 163500,
            gasOverheadAfterCallback: 57000,
            timeoutTimestamp: 1787623447
        });

        // Consumer2 0x318c…, 2026-08-25
        c[2] = Commitment({
            requestId: 0x7dbf72ef5c6c05bbfa6852d410856fe96cabe8287538b0bf297caa5d83876ab1,
            coordinator: COORDINATOR,
            estimatedTotalCostJuels: 556933522093715005,
            client: CONSUMER2,
            subscriptionId: SUBSCRIPTION_ID,
            callbackGasLimit: 300000,
            adminFee: 0,
            donFee: 0,
            gasOverheadBeforeCallback: 163500,
            gasOverheadAfterCallback: 57000,
            timeoutTimestamp: 1787622185
        });
        c[3] = Commitment({
            requestId: 0x1802811c79556d60666e05fc2b05eb02b0f1b7c2ea8594fb0a2160e3de57cde3,
            coordinator: COORDINATOR,
            estimatedTotalCostJuels: 556932591656354404,
            client: CONSUMER2,
            subscriptionId: SUBSCRIPTION_ID,
            callbackGasLimit: 300000,
            adminFee: 0,
            donFee: 0,
            gasOverheadBeforeCallback: 163500,
            gasOverheadAfterCallback: 57000,
            timeoutTimestamp: 1787622233
        });
        c[4] = Commitment({
            requestId: 0xb76576c78159d3a78fa261157d2043dbc2b56c7718f65e70b714e1fc003b9892,
            coordinator: COORDINATOR,
            estimatedTotalCostJuels: 556917817088521992,
            client: CONSUMER2,
            subscriptionId: SUBSCRIPTION_ID,
            callbackGasLimit: 300000,
            adminFee: 0,
            donFee: 0,
            gasOverheadBeforeCallback: 163500,
            gasOverheadAfterCallback: 57000,
            timeoutTimestamp: 1787622849
        });
    }
}
