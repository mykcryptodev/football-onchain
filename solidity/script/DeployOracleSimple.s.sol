// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {GameScoreOracle} from "../contracts/src/GameScoreOracle.sol";

contract DeployOracleSimple is Script {
    // Base chain Chainlink Functions router
    address constant CHAINLINK_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Just deploy the oracle - nothing else
        GameScoreOracle newOracle = new GameScoreOracle(CHAINLINK_FUNCTIONS_ROUTER);
        
        vm.stopBroadcast();
        
        // Only log output after broadcast ends
        console.log("Oracle deployed at:", address(newOracle));
        console.log("");
        console.log("Next steps - run these commands separately:");
        console.log("1. Add as consumer:");
        console.log("   cast send 0xf9B8fc078197181C841c296C876945aaa425B278 'addConsumer(uint64,address)' 6", address(newOracle), "--rpc-url https://mainnet.base.org --private-key $PRIVATE_KEY");
        console.log("");
        console.log("2. Update Pickem:");
        console.log("   cast send 0x602b49e4c54724ae53a491ae60cd8ecf5690e5c7 'setGameScoreOracle(address)'", address(newOracle), "--rpc-url https://mainnet.base.org --private-key $PRIVATE_KEY");
        console.log("");
        console.log("3. Verify contract:");
        console.log("   make verify-oracle ADDRESS=", address(newOracle));
    }
}
