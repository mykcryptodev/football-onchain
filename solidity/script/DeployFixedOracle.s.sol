// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {GameScoreOracle} from "../contracts/src/GameScoreOracle.sol";
import {Pickem} from "../contracts/src/Pickem.sol";

interface IFunctionsSubscriptionManager {
    struct Subscription {
        uint96 balance;
        address owner;
        uint96 blockedBalance;
        address proposedOwner;
        address[] consumers;
        bytes32 flags;
    }
    
    function addConsumer(uint64 subscriptionId, address consumer) external;
    function removeConsumer(uint64 subscriptionId, address consumer) external;
    function getSubscription(uint64 subscriptionId) external view returns (Subscription memory);
}

contract DeployFixedOracle is Script {
    // Base chain Chainlink Functions router
    address constant CHAINLINK_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    
    // Base chain Chainlink Functions Subscription Manager
    // Note: This is the same as the router address on Base
    address constant CHAINLINK_SUBSCRIPTION_MANAGER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    
    // Existing Pickem contract on Base
    address constant PICKEM_CONTRACT = 0x602B49E4C54724ae53A491Ae60CD8eCf5690E5C7;
    
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint64 subscriptionId = uint64(vm.envUint("CHAINLINK_SUBSCRIPTION_ID"));
        
        // Optional: Get the old oracle address to remove it from the subscription
        address oldOracle = address(0);
        try vm.envAddress("OLD_ORACLE_ADDRESS") returns (address addr) {
            oldOracle = addr;
        } catch {
            console.log("No OLD_ORACLE_ADDRESS provided, skipping removal");
        }
        
        // Get the subscription manager
        IFunctionsSubscriptionManager subscriptionManager = IFunctionsSubscriptionManager(CHAINLINK_SUBSCRIPTION_MANAGER);
        
        // Check current consumers BEFORE deployment
        IFunctionsSubscriptionManager.Subscription memory subscription = subscriptionManager.getSubscription(subscriptionId);
        console.log("Initial subscription check:");
        console.log("Subscription balance:", subscription.balance);
        console.log("Subscription owner:", subscription.owner);
        console.log("Current number of consumers:", subscription.consumers.length);
        
        // Check if we need to remove an old consumer first
        if (subscription.consumers.length >= 32) {
            console.log("Subscription has maximum consumers (32). Need to remove one first.");
            
            if (oldOracle == address(0)) {
                console.log("ERROR: Subscription has 32 consumers (maximum).");
                console.log("Please either:");
                console.log("1. Set OLD_ORACLE_ADDRESS in your .env file to remove the previous oracle");
                console.log("2. Manually remove an unused consumer from your subscription at:");
                console.log("   https://functions.chain.link/base/6");
                console.log("\nCurrent consumers:");
                for (uint i = 0; i < subscription.consumers.length && i < 5; i++) {
                    console.log("  -", subscription.consumers[i]);
                }
                console.log("  ... and", subscription.consumers.length - 5, "more");
                revert("Subscription full - remove a consumer first");
            }
        }
        
        // Start a single broadcast for all transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Remove old oracle if needed and provided
        if (subscription.consumers.length >= 32 && oldOracle != address(0)) {
            console.log("Removing old oracle from subscription:", oldOracle);
            subscriptionManager.removeConsumer(subscriptionId, oldOracle);
            console.log("Old oracle removed successfully");
        }
        
        // Deploy the fixed GameScoreOracle
        console.log("Deploying GameScoreOracle contract...");
        GameScoreOracle newOracle = new GameScoreOracle(CHAINLINK_FUNCTIONS_ROUTER);
        console.log("Fixed GameScoreOracle deployed at:", address(newOracle));
        
        // Add oracle as consumer
        console.log("Adding oracle as consumer to subscription", subscriptionId);
        subscriptionManager.addConsumer(subscriptionId, address(newOracle));
        console.log("Oracle added as consumer successfully");
        
        // Update Pickem contract to use new oracle
        console.log("Updating Pickem contract to use new oracle...");
        Pickem pickem = Pickem(PICKEM_CONTRACT);
        pickem.setGameScoreOracle(address(newOracle));
        console.log("Pickem contract updated to use new oracle");
        
        // End the broadcast
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("New Oracle Address:", address(newOracle));
        console.log("Oracle added to subscription:", subscriptionId);
        console.log("Pickem contract updated successfully");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Verify the contract on BaseScan:");
        console.log("   make verify-oracle ADDRESS=", vm.toString(address(newOracle)));
        console.log("2. Run the fix for Contest 0:");
        console.log("   make fix-contest-0");
        console.log("");
    }
}
