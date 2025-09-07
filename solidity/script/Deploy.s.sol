// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {Boxes} from "../contracts/src/Boxes.sol";
import {Contests} from "../contracts/src/Contests.sol";
import {ContestsReader} from "../contracts/src/ContestsReader.sol";
import {GameScoreOracle} from "../contracts/src/GameScoreOracle.sol";
import {RandomNumbers} from "../contracts/src/RandomNumbers.sol";

interface IFunctionsSubscriptionRegistry {
    function addConsumer(uint64 subscriptionId, address consumer) external;
}

contract Deploy is Script {
    // Network configurations
    mapping(uint256 => address) public functionsRouter;
    mapping(uint256 => address) public vrfWrapper;
    mapping(uint256 => uint64) public functionsSubscriptionId;
    mapping(uint256 => address) public functionsSubscriptionRegistry;

    // Contract instances
    Boxes public boxes;
    GameScoreOracle public gameScoreOracle;
    ContestsReader public contestsReader;
    RandomNumbers public randomNumbers;
    Contests public contests;

    function setUp() public {
        // Base Sepolia (84532)
        functionsRouter[84532] = 0xf9B8fc078197181C841c296C876945aaa425B278;
        vrfWrapper[84532] = 0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed;
        functionsSubscriptionId[84532] = 208;
        functionsSubscriptionRegistry[84532] = 0xf9B8fc078197181C841c296C876945aaa425B278;

        // Base Mainnet (8453)
        functionsRouter[8453] = 0xf9B8fc078197181C841c296C876945aaa425B278;
        vrfWrapper[8453] = 0xb0407dbe851f8318bd31404A49e658143C982F23;
        functionsSubscriptionId[8453] = 6;
        functionsSubscriptionRegistry[8453] = 0xf9B8fc078197181C841c296C876945aaa425B278;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 chainId = block.chainid;

        console.log("=== Football Boxes Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", chainId);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("");

        // Validate network support
        require(
            functionsRouter[chainId] != address(0),
            "Unsupported network - no Functions Router configured"
        );

        // Check if we should estimate gas first
        bool estimateOnly = vm.envOr("ESTIMATE_GAS_ONLY", false);
        if (estimateOnly) {
            _estimateDeploymentCost(deployer, chainId);
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Boxes contract
        console.log("Deploying Boxes contract...");
        boxes = new Boxes();
        console.log("Boxes deployed at:", address(boxes));
        console.log("");

        // 2. Deploy GameScoreOracle contract
        console.log("Deploying GameScoreOracle contract...");
        gameScoreOracle = new GameScoreOracle(functionsRouter[chainId]);
        console.log("GameScoreOracle deployed at:", address(gameScoreOracle));
        console.log("");

        // 3. Deploy ContestsReader contract
        console.log("Deploying ContestsReader contract...");
        contestsReader = new ContestsReader();
        console.log("ContestsReader deployed at:", address(contestsReader));
        console.log("");

        // 4. Deploy RandomNumbers contract
        console.log("Deploying RandomNumbers contract...");
        randomNumbers = new RandomNumbers(vrfWrapper[chainId]);
        console.log("RandomNumbers deployed at:", address(randomNumbers));
        console.log("");

        // 5. Add GameScoreOracle to Functions subscription
        console.log("Adding GameScoreOracle to Functions subscription...");
        IFunctionsSubscriptionRegistry registry = IFunctionsSubscriptionRegistry(
            functionsSubscriptionRegistry[chainId]
        );
        registry.addConsumer(
            functionsSubscriptionId[chainId],
            address(gameScoreOracle)
        );
        console.log("GameScoreOracle added to Functions subscription");
        console.log("");

        // 6. Deploy Contests contract
        console.log("Deploying Contests contract...");
        contests = new Contests(
            deployer,                   // treasury
            boxes,                      // boxes contract
            gameScoreOracle,           // gameScoreOracle contract
            contestsReader,            // contestsReader contract
            randomNumbers              // randomNumbers contract
        );
        console.log("Contests deployed at:", address(contests));
        console.log("");

        // 7. Configure contract relationships
        console.log("Configuring contract relationships...");

        // Set contests in boxes contract
        boxes.setContests(contests);
        console.log("Contests set in Boxes contract");

        // Set contest storage in contestsReader contract
        contestsReader.setContestStorage(address(contests));
        console.log("Contest storage set in ContestsReader contract");

        // Set contests in randomNumbers contract
        randomNumbers.setContests(address(contests));
        console.log("Contests set in RandomNumbers contract");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Boxes:          ", address(boxes));
        console.log("GameScoreOracle:", address(gameScoreOracle));
        console.log("ContestsReader: ", address(contestsReader));
        console.log("RandomNumbers:  ", address(randomNumbers));
        console.log("Contests:       ", address(contests));
        console.log("");

        // Auto-verify contracts if API key is available
        string memory apiKey = vm.envOr("BASESCAN_API_KEY", string(""));
        if (bytes(apiKey).length > 0) {
            console.log("=== Auto-Verifying Contracts ===");
            _verifyContracts(chainId, deployer, apiKey);
        } else {
            console.log("=== Manual Verification Commands ===");
            console.log("BASESCAN_API_KEY not set. Run these commands to verify contracts manually:");
            console.log("");
            _printVerificationCommands(chainId, deployer);
        }
    }

    function _verifyContracts(uint256 chainId, address deployer, string memory apiKey) internal {
        string memory verifierUrl = _getVerifierUrl(chainId);

        console.log("Verifying Boxes...");
        _verifyContract("Boxes", address(boxes), "", apiKey, verifierUrl);

        console.log("Verifying GameScoreOracle...");
        _verifyContract(
            "GameScoreOracle",
            address(gameScoreOracle),
            vm.toString(abi.encode(functionsRouter[chainId])),
            apiKey,
            verifierUrl
        );

        console.log("Verifying ContestsReader...");
        _verifyContract("ContestsReader", address(contestsReader), "", apiKey, verifierUrl);

        console.log("Verifying RandomNumbers...");
        _verifyContract(
            "RandomNumbers",
            address(randomNumbers),
            vm.toString(abi.encode(vrfWrapper[chainId])),
            apiKey,
            verifierUrl
        );

        console.log("Verifying Contests...");
        string memory contestsArgs = vm.toString(abi.encode(
            deployer,
            address(boxes),
            address(gameScoreOracle),
            address(contestsReader),
            address(randomNumbers)
        ));
        _verifyContract("Contests", address(contests), contestsArgs, apiKey, verifierUrl);

        console.log("All contracts verified successfully!");
    }

    function _verifyContract(
        string memory contractName,
        address contractAddress,
        string memory constructorArgs,
        string memory apiKey,
        string memory verifierUrl
    ) internal {
        string[] memory verifyCommand = new string[](12);
        verifyCommand[0] = "forge";
        verifyCommand[1] = "verify-contract";
        verifyCommand[2] = vm.toString(contractAddress);
        verifyCommand[3] = string(abi.encodePacked("contracts/src/", contractName, ".sol:", contractName));
        verifyCommand[4] = "--etherscan-api-key";
        verifyCommand[5] = apiKey;
        verifyCommand[6] = "--verifier-url";
        verifyCommand[7] = verifierUrl;

        if (bytes(constructorArgs).length > 0) {
            verifyCommand[8] = "--constructor-args";
            verifyCommand[9] = constructorArgs;
            verifyCommand[10] = "--watch";
            verifyCommand[11] = "";
        } else {
            verifyCommand[8] = "--watch";
            verifyCommand[9] = "";
            verifyCommand[10] = "";
            verifyCommand[11] = "";
        }

        try vm.ffi(verifyCommand) {
            console.log(string(abi.encodePacked(contractName, " verified successfully")));
        } catch {
            console.log(string(abi.encodePacked("Failed to verify ", contractName, " - continuing with deployment")));
        }
    }

    function _getVerifierUrl(uint256 chainId) internal pure returns (string memory) {
        if (chainId == 84532) {
            return "https://api-sepolia.basescan.org/api";
        } else if (chainId == 8453) {
            return "https://api.basescan.org/api";
        } else {
            revert("Unsupported chain for verification");
        }
    }

    function _printVerificationCommands(uint256 chainId, address deployer) internal view {
        string memory verifierUrl = _getVerifierUrl(chainId);

        _printVerificationCommand("Boxes", address(boxes), "", verifierUrl);
        _printVerificationCommand(
            "GameScoreOracle",
            address(gameScoreOracle),
            vm.toString(abi.encode(functionsRouter[chainId])),
            verifierUrl
        );
        _printVerificationCommand("ContestsReader", address(contestsReader), "", verifierUrl);
        _printVerificationCommand(
            "RandomNumbers",
            address(randomNumbers),
            vm.toString(abi.encode(vrfWrapper[chainId])),
            verifierUrl
        );

        string memory contestsArgs = vm.toString(abi.encode(
            deployer,
            address(boxes),
            address(gameScoreOracle),
            address(contestsReader),
            address(randomNumbers)
        ));
        _printVerificationCommand("Contests", address(contests), contestsArgs, verifierUrl);
    }

    function _printVerificationCommand(
        string memory contractName,
        address contractAddress,
        string memory constructorArgs,
        string memory verifierUrl
    ) internal pure {
        if (bytes(constructorArgs).length > 0) {
            console.log(
                string(abi.encodePacked(
                    "forge verify-contract ",
                    vm.toString(contractAddress),
                    " contracts/src/",
                    contractName,
                    ".sol:",
                    contractName,
                    " --constructor-args ",
                    constructorArgs,
                    " --etherscan-api-key $BASESCAN_API_KEY --verifier-url ",
                    verifierUrl,
                    " --watch"
                ))
            );
        } else {
            console.log(
                string(abi.encodePacked(
                    "forge verify-contract ",
                    vm.toString(contractAddress),
                    " contracts/src/",
                    contractName,
                    ".sol:",
                    contractName,
                    " --etherscan-api-key $BASESCAN_API_KEY --verifier-url ",
                    verifierUrl,
                    " --watch"
                ))
            );
        }
    }

    function _estimateDeploymentCost(address deployer, uint256 chainId) internal {
        console.log("=== Gas Estimation Mode ===");
        console.log("Estimating deployment costs...");
        console.log("");

        uint256 totalGasEstimate = 0;
        uint256 gasPrice = tx.gasprice;
        if (gasPrice == 0) {
            gasPrice = 1 gwei; // fallback gas price for testnets (Base Sepolia typically uses ~1 gwei)
            console.log("Gas price (fallback):   ", gasPrice / 1e9, "gwei");
        } else {
            console.log("Current gas price:      ", gasPrice / 1e9, "gwei");
        }
        console.log("");

        // Estimate each contract deployment
        uint256 boxesGas = _estimateContractGas("Boxes", type(Boxes).creationCode, "");
        totalGasEstimate += boxesGas;

        uint256 oracleGas = _estimateContractGas(
            "GameScoreOracle",
            type(GameScoreOracle).creationCode,
            abi.encode(functionsRouter[chainId])
        );
        totalGasEstimate += oracleGas;

        uint256 readerGas = _estimateContractGas("ContestsReader", type(ContestsReader).creationCode, "");
        totalGasEstimate += readerGas;

        uint256 randomGas = _estimateContractGas(
            "RandomNumbers",
            type(RandomNumbers).creationCode,
            abi.encode(vrfWrapper[chainId])
        );
        totalGasEstimate += randomGas;

        uint256 contestsGas = _estimateContractGas("Contests", type(Contests).creationCode, "");
        totalGasEstimate += contestsGas;

        // Estimate setup transactions (approximate)
        uint256 setupGas = 300000; // Approximate gas for all setup calls
        totalGasEstimate += setupGas;
        console.log("Setup transactions: ~", setupGas, "gas");

        console.log("");
        console.log("=== Cost Summary ===");
        console.log("Total estimated gas:    ", totalGasEstimate);
        console.log("Gas price:              ", gasPrice / 1e9, "gwei");

        uint256 totalCostWei = totalGasEstimate * gasPrice;

        // Format and display costs in ETH with 6 decimal places
        _displayEthAmount("Total estimated cost:   ", totalCostWei);
        _displayEthAmount("Your current balance:   ", deployer.balance);

        if (deployer.balance < totalCostWei) {
            console.log("");
            console.log("WARNING: Insufficient balance for deployment!");
            _displayEthAmount("You need at least:      ", totalCostWei);
        } else {
            uint256 remaining = deployer.balance - totalCostWei;
            _displayEthAmount("Remaining balance:      ", remaining);
        }

        console.log("");
        console.log("Note: These are estimates and actual costs may vary due to network conditions.");
    }

    function _estimateContractGas(
        string memory contractName,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (uint256) {
        bytes memory deployCode = bytes.concat(creationCode, constructorArgs);

        // Estimate gas using a rough calculation
        // Base deployment cost + code size cost
        uint256 baseGas = 21000; // Base transaction cost
        uint256 codeGas = deployCode.length * 200; // Approximate cost per byte
        uint256 estimatedGas = baseGas + codeGas + 500000; // Add buffer for constructor execution

        console.log(string(abi.encodePacked(contractName, ": ~")), estimatedGas, "gas");

        return estimatedGas;
    }

    function _displayEthAmount(string memory label, uint256 amountWei) internal pure {
        // Convert wei to ETH with 6 decimal places
        uint256 ethWhole = amountWei / 1e18;
        uint256 ethDecimals = (amountWei % 1e18) / 1e12; // 6 decimal places

        // Pad decimals to always show 6 digits
        string memory decimalsStr;
        if (ethDecimals < 100000) {
            if (ethDecimals < 10000) {
                if (ethDecimals < 1000) {
                    if (ethDecimals < 100) {
                        if (ethDecimals < 10) {
                            decimalsStr = string(abi.encodePacked("00000", vm.toString(ethDecimals)));
                        } else {
                            decimalsStr = string(abi.encodePacked("0000", vm.toString(ethDecimals)));
                        }
                    } else {
                        decimalsStr = string(abi.encodePacked("000", vm.toString(ethDecimals)));
                    }
                } else {
                    decimalsStr = string(abi.encodePacked("00", vm.toString(ethDecimals)));
                }
            } else {
                decimalsStr = string(abi.encodePacked("0", vm.toString(ethDecimals)));
            }
        } else {
            decimalsStr = vm.toString(ethDecimals);
        }

        console.log(string(abi.encodePacked(label, vm.toString(ethWhole), ".", decimalsStr, " ETH")));
    }
}
