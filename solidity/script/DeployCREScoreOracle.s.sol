// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {CREScoreOracle} from "../contracts/src/CREScoreOracle.sol";

contract DeployCREScoreOracle is Script {
    // Base mainnet KeystoneForwarder
    address constant KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address forwarder = vm.envOr("KEYSTONE_FORWARDER", KEYSTONE_FORWARDER);

        vm.startBroadcast(deployerPrivateKey);

        CREScoreOracle oracle = new CREScoreOracle(forwarder);

        vm.stopBroadcast();

        console.log("CREScoreOracle deployed at:", address(oracle));
        console.log("Forwarder:", forwarder);
        console.log("");
        console.log("Verify with:");
        console.log("  make verify-cre-oracle ADDRESS=", address(oracle));
    }
}
