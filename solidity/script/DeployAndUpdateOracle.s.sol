// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {GameScoreOracle} from "../contracts/src/GameScoreOracle.sol";
import {Contests} from "../contracts/src/Contests.sol";
import {Pickem} from "../contracts/src/Pickem.sol";

interface IFunctionsSubscriptionRegistry {
    function addConsumer(uint64 subscriptionId, address consumer) external;
}

contract DeployAndUpdateOracle is Script {
    // Base chain Chainlink Functions router
    address constant CHAINLINK_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    
    // Network configurations
    mapping(uint256 => uint64) public functionsSubscriptionId;
    mapping(uint256 => address) public functionsSubscriptionRegistry;
    
    function setUp() public {
        // Base Sepolia (84532)
        functionsSubscriptionId[84532] = 208;
        functionsSubscriptionRegistry[84532] = 0xf9B8fc078197181C841c296C876945aaa425B278;
        
        // Base Mainnet (8453)
        functionsSubscriptionId[8453] = 6;
        functionsSubscriptionRegistry[8453] = 0xf9B8fc078197181C841c296C876945aaa425B278;
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;
        
        // Get contract addresses from environment or use defaults
        address contestsAddress = vm.envOr("CONTESTS_ADDRESS", address(0));
        address pickemAddress = vm.envOr("PICKEM_ADDRESS", address(0));
        
        require(contestsAddress != address(0) || pickemAddress != address(0), 
            "Must provide CONTESTS_ADDRESS or PICKEM_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy the new oracle
        console.log("=== Step 1: Deploying New Oracle Contract ===");
        GameScoreOracle newOracle = new GameScoreOracle(CHAINLINK_FUNCTIONS_ROUTER);
        console.log("New Oracle deployed at:", address(newOracle));
        console.log("");
        
        // Step 2: Add oracle as consumer to Chainlink subscription
        console.log("=== Step 2: Adding Oracle as Consumer ===");
        IFunctionsSubscriptionRegistry registry = IFunctionsSubscriptionRegistry(
            functionsSubscriptionRegistry[chainId]
        );
        registry.addConsumer(
            functionsSubscriptionId[chainId],
            address(newOracle)
        );
        console.log("Oracle added to subscription", functionsSubscriptionId[chainId]);
        console.log("");
        
        // Step 3: Update Contests contract (if provided)
        if (contestsAddress != address(0)) {
            console.log("=== Step 3: Updating Contests Contract ===");
            Contests contests = Contests(contestsAddress);
            contests.setGameScoreOracle(address(newOracle));
            console.log("Contests contract updated to use new oracle");
            console.log("");
        }
        
        // Step 4: Update Pickem contract (if provided)
        if (pickemAddress != address(0)) {
            console.log("=== Step 4: Updating Pickem Contract ===");
            Pickem pickem = Pickem(pickemAddress);
            pickem.setGameScoreOracle(address(newOracle));
            console.log("Pickem contract updated to use new oracle");
            console.log("");
        }
        
        vm.stopBroadcast();
        
        // Output summary
        console.log("=== Deployment Summary ===");
        console.log("New Oracle Address:", address(newOracle));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify the contract:");
        console.log("   make verify-oracle ADDRESS=", address(newOracle));
        console.log("");
        console.log("2. Verify the update:");
        if (contestsAddress != address(0)) {
            console.log("   cast call", contestsAddress, "gameScoreOracle() --rpc-url <RPC_URL>");
        }
        if (pickemAddress != address(0)) {
            console.log("   cast call", pickemAddress, "gameScoreOracle() --rpc-url <RPC_URL>");
        }
    }
}


