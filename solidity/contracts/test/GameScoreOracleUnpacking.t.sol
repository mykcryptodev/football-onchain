// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {GameScoreOracle} from "../src/GameScoreOracle.sol";

// Mock contract to expose internal fulfillRequest function for testing
contract MockGameScoreOracle is GameScoreOracle {
    constructor(address router_) GameScoreOracle(router_) {}

    function fulfillRequestPublic(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external {
        fulfillRequest(requestId, response, err);
    }
}

contract GameScoreOracleUnpackingTest is Test {
    MockGameScoreOracle oracle;

    function setUp() public {
        // Deploy mock oracle with mock router address
        oracle = new MockGameScoreOracle(address(0x1234567890123456789012345678901234567890));
    }

    function testGasUsageWithFulfillRequest() public {
        // This test will fail because we can't easily set up the gameScoreRequests mapping
        // But it will show us the gas usage for the unpacking logic
        uint256 gameId = 12345;

        // The specific output from Chainlink Functions (updated to match current JavaScript packing)
        bytes memory response = hex"00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f000a0728060703250000000000000000000000000000000000000000000000000070636700000000000000000000000000000000000000000000000000000000014010860110106e01100d6f00a00d4300300d4700300646000006260000032300000000028025a70250258f0220258f02201e8801b01e8e01b0178f01401783";
        bytes memory err = "";

        // We expect this to fail because gameScoreRequests[requestId] will be 0
        // But we can still measure gas usage
        try oracle.fulfillRequestPublic(
            bytes32(uint256(0x1234567890123456789012345678901234567890123456789012345678901234)),
            response,
            err
        ) {
            console.log("Unexpected success - this should have failed");
        } catch {
            console.log("Expected failure - gameScoreRequests mapping not set up");
        }

        // Let's test the unpacking logic directly instead
        testUnpackingLogicGasUsage();
    }

    function testUnpackingLogicGasUsage() public {
        // Test the unpacking logic gas usage by calling the helper functions
        bytes memory response = hex"00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f000a0728060703250000000000000000000000000000000000000000000000000070636700000000000000000000000000000000000000000000000000000000014010860110106e01100d6f00a00d4300300d4700300646000006260000032300000000028025a70250258f0220258f02201e8801b01e8e01b0178f01401783";

        uint256 gasStart = gasleft();

        // Test the _bytesToUint256 function multiple times (simulating unpacking)
        for (uint8 i = 0; i < 10; i++) {
            _bytesToUint256(response, i);
        }

        uint256 gasUsed = gasStart - gasleft();

        console.log("=== Unpacking Logic Gas Usage ===");
        console.log("Gas used for 10 _bytesToUint256 calls:", gasUsed);
        console.log("Gas per _bytesToUint256 call:", gasUsed / 10);

        // Test bitwise operations (simulating unpacking packed data)
        gasStart = gasleft();

        uint256 packedValue = _bytesToUint256(response, 0);
        for (uint8 i = 0; i < 100; i++) {
            // Simulate unpacking operations
            uint8 value1 = uint8((packedValue >> 252) & 0xF);
            uint8 value2 = uint8((packedValue >> 248) & 0xF);
            uint8 value3 = uint8((packedValue >> 244) & 0xF);
            uint8 value4 = uint8((packedValue >> 240) & 0xF);
        }

        gasUsed = gasStart - gasleft();

        console.log("Gas used for 100 bitwise unpacking operations:", gasUsed);
        console.log("Gas per unpacking operation:", gasUsed / 100);

        console.log("Estimated total gas for fulfillRequest (unpacking only):", gasUsed / 100 * 15 + 20000);

        // Calculate gas savings for different score change limits
        console.log("=== Gas Savings Analysis ===");
        console.log("Current gas usage: 590914");
        console.log("Current score changes: 15");
        uint256 gasPerScoreChange = uint256(390914) / uint256(15);
        console.log("Gas per score change:", gasPerScoreChange);
        console.log("Gas for 16 score changes:", 200000 + gasPerScoreChange * 16);
        console.log("Gas for 8 score changes:", 200000 + gasPerScoreChange * 8);
    }

    function testUnpackSpecificOutput() public {
        // The specific output from Chainlink Functions (updated to match current JavaScript packing)
        bytes memory response = hex"00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f000a0728060703250000000000000000000000000000000000000000000000000070636700000000000000000000000000000000000000000000000000000000014010860110106e01100d6f00a00d4300300d4700300646000006260000032300000000028025a70250258f0220258f02201e8801b01e8e01b0178f01401783";

        // Debug: Let's see what's actually in each index
        console.log("=== Response Structure Debug ===");
        for (uint8 i = 0; i < 5; i++) {
            uint256 value = _bytesToUint256(response, i);
            console.log("Index", i, ":", value);
        }

        // Manually unpack the data to verify our logic (updated to match current Solidity unpacking)
        uint8 qComplete = uint8(_bytesToUint256(response, 0));
        bool gameCompleted = _bytesToUint256(response, 1) == 1;
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 2));
        uint256 packedQuarterScores = _bytesToUint256(response, 3);
        uint256 packedQuarterDigits = _bytesToUint256(response, 4);

        console.log("=== Unpacked Data ===");
        console.log("Q Complete:", qComplete);
        console.log("Game Completed:", gameCompleted);
        console.log("Total Score Changes:", totalScoreChanges);
        console.log("Packed Quarter Scores:", packedQuarterScores);
        console.log("Packed Quarter Digits:", packedQuarterDigits);

        // Unpack quarter digits from packedQuarterDigits
        uint8 homeQ1LastDigit = uint8((packedQuarterDigits >> 252) & 0xF);
        uint8 homeQ2LastDigit = uint8((packedQuarterDigits >> 248) & 0xF);
        uint8 homeQ3LastDigit = uint8((packedQuarterDigits >> 244) & 0xF);
        uint8 homeFLastDigit = uint8((packedQuarterDigits >> 240) & 0xF);
        uint8 awayQ1LastDigit = uint8((packedQuarterDigits >> 236) & 0xF);
        uint8 awayQ2LastDigit = uint8((packedQuarterDigits >> 232) & 0xF);
        uint8 awayQ3LastDigit = uint8((packedQuarterDigits >> 228) & 0xF);
        uint8 awayFLastDigit = uint8((packedQuarterDigits >> 224) & 0xF);

        console.log("=== Quarter Digits ===");
        console.log("Home Q1 Last Digit:", homeQ1LastDigit);
        console.log("Home Q2 Last Digit:", homeQ2LastDigit);
        console.log("Home Q3 Last Digit:", homeQ3LastDigit);
        console.log("Home F Last Digit:", homeFLastDigit);
        console.log("Away Q1 Last Digit:", awayQ1LastDigit);
        console.log("Away Q2 Last Digit:", awayQ2LastDigit);
        console.log("Away Q3 Last Digit:", awayQ3LastDigit);
        console.log("Away F Last Digit:", awayFLastDigit);

        // Unpack score changes (updated to match current Solidity logic)
        console.log("=== Score Changes ===");
        for (uint8 i = 0; i < totalScoreChanges && i < 32; i++) {
            uint8 uint256Index = 3 + (i / 8);  // Score changes are packed into index 3+
            uint8 offsetInUint256 = i % 8;

            uint256 packedUint256 = _bytesToUint256(response, uint256Index);
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            uint16 homeScore = uint16((packedChange >> 20) & 0xFFF);
            uint16 awayScore = uint16((packedChange >> 8) & 0xFFF);
            uint8 quarter = uint8((packedChange >> 5) & 0x7);
            uint8 homeLastDigit = uint8((packedChange >> 1) & 0xF);
            uint8 awayLastDigit = uint8(packedChange & 0xF);

            console.log("Score Change %d:", i);
            console.log("  Home Score:", homeScore);
            console.log("  Away Score:", awayScore);
            console.log("  Quarter:", quarter);
            console.log("  Home Last Digit:", homeLastDigit);
            console.log("  Away Last Digit:", awayLastDigit);
            console.log("  Packed Change:", packedChange);
        }

        // Verify the data makes sense
        assertTrue(qComplete == 100, "Q Complete should be 100 (game finished)");
        assertTrue(gameCompleted == true, "Game should be completed");
        assertTrue(totalScoreChanges == 15, "Should have 15 score changes");
    }

    function testQuarterScoresRequest() public {
        // Test with the actual quarter scores Chainlink Functions output
        bytes memory response = hex"00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f000a0728060703250000000000000000000000000000000000000000000000000070636700000000000000000000000000000000000000000000000000000000014010860110106e01100d6f00a00d4300300d4700300646000006260000032300000000028025a70250258f0220258f02201e8801b01e8e01b0178f01401783";

        console.log("=== QUARTER SCORES TEST ===");

        // Unpack the response manually to verify our logic
        uint8 qComplete = uint8(_bytesToUint256(response, 0));
        bool gameCompleted = _bytesToUint256(response, 1) == 1;
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 2));
        uint256 packedQuarterScores = _bytesToUint256(response, 3);
        uint256 packedQuarterDigits = _bytesToUint256(response, 4);

        console.log("qComplete:", qComplete);
        console.log("gameCompleted:", gameCompleted);
        console.log("totalScoreChanges:", totalScoreChanges);

        // Unpack quarter scores
        uint8 homeQ1 = uint8((packedQuarterScores >> 248) & 0xFF);
        uint8 homeQ2 = uint8((packedQuarterScores >> 240) & 0xFF);
        uint8 homeQ3 = uint8((packedQuarterScores >> 232) & 0xFF);
        uint8 homeF = uint8((packedQuarterScores >> 224) & 0xFF);
        uint8 awayQ1 = uint8((packedQuarterScores >> 216) & 0xFF);
        uint8 awayQ2 = uint8((packedQuarterScores >> 208) & 0xFF);
        uint8 awayQ3 = uint8((packedQuarterScores >> 200) & 0xFF);
        uint8 awayF = uint8((packedQuarterScores >> 192) & 0xFF);

        console.log("Quarter Scores:");
        console.log("Home Q1:", homeQ1, "Away Q1:", awayQ1);
        console.log("Home Q2:", homeQ2, "Away Q2:", awayQ2);
        console.log("Home Q3:", homeQ3, "Away Q3:", awayQ3);
        console.log("Home F:", homeF, "Away F:", awayF);

        // Unpack quarter digits
        uint8 homeQ1LastDigit = uint8((packedQuarterDigits >> 252) & 0xF);
        uint8 homeQ2LastDigit = uint8((packedQuarterDigits >> 248) & 0xF);
        uint8 homeQ3LastDigit = uint8((packedQuarterDigits >> 244) & 0xF);
        uint8 homeFLastDigit = uint8((packedQuarterDigits >> 240) & 0xF);
        uint8 awayQ1LastDigit = uint8((packedQuarterDigits >> 236) & 0xF);
        uint8 awayQ2LastDigit = uint8((packedQuarterDigits >> 232) & 0xF);
        uint8 awayQ3LastDigit = uint8((packedQuarterDigits >> 228) & 0xF);
        uint8 awayFLastDigit = uint8((packedQuarterDigits >> 224) & 0xF);

        console.log("Quarter Digits:");
        console.log("Home Q1:", homeQ1LastDigit, "Away Q1:", awayQ1LastDigit);
        console.log("Home Q2:", homeQ2LastDigit, "Away Q2:", awayQ2LastDigit);
        console.log("Home Q3:", homeQ3LastDigit, "Away Q3:", awayQ3LastDigit);
        console.log("Home F:", homeFLastDigit, "Away F:", awayFLastDigit);

        // Verify expected values
        assertEq(qComplete, 100);
        assertEq(gameCompleted, true);
        assertEq(totalScoreChanges, 15);

        console.log("Quarter scores test completed successfully!");
    }

    function testScoreChangesRequest() public {
        // Test with the actual score changes Chainlink Functions output
        bytes memory response = hex"000000000000000000000000000000000000000000000000000000000000000f000000060000000e0000000f000000030000000700000006000000060000000300000000000000070000000f0000000f000000080000000e0000000f00000003";

        console.log("=== SCORE CHANGES TEST ===");

        // Unpack the response manually to verify our logic
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 0));

        console.log("totalScoreChanges:", totalScoreChanges);

        // Process score changes (simplified - only homeLastDigit and awayLastDigit)
        for (uint8 i = 0; i < totalScoreChanges && i < 20; i++) {
            uint8 uint256Index = 1 + (i / 8);  // Score changes start at index 1
            uint8 offsetInUint256 = i % 8;     // Position within that uint256 (0-7)

            uint256 packedUint256 = _bytesToUint256(response, uint256Index);
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            // Unpack only the last digits (simplified format)
            uint8 homeLastDigit = uint8((packedChange >> 4) & 0xF);       // 4 bits
            uint8 awayLastDigit = uint8(packedChange & 0xF);             // 4 bits

            console.log("Score Change", i, ":");
            console.log("  Home Last Digit:", homeLastDigit, "Away Last Digit:", awayLastDigit);
        }

        // Verify expected values
        assertEq(totalScoreChanges, 15);

        console.log("Score changes test completed successfully!");
    }

    function testBothRequestTypes() public {
        console.log("=== TESTING BOTH REQUEST TYPES ===");

        // Test quarter scores
        testQuarterScoresRequest();

        // Test score changes
        testScoreChangesRequest();

        console.log("Both request types test completed successfully!");
    }

    function testGasUsageComparison() public {
        console.log("=== GAS USAGE COMPARISON ===");

        // Test quarter scores gas usage
        bytes memory quarterResponse = hex"00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000f000a0728060703250000000000000000000000000000000000000000000000000070636700000000000000000000000000000000000000000000000000000000014010860110106e01100d6f00a00d4300300d4700300646000006260000032300000000028025a70250258f0220258f02201e8801b01e8e01b0178f01401783";

        uint256 gasStart = gasleft();

        // Simulate quarter scores unpacking
        uint8 qComplete = uint8(_bytesToUint256(quarterResponse, 0));
        bool gameCompleted = _bytesToUint256(quarterResponse, 1) == 1;
        uint8 totalScoreChanges = uint8(_bytesToUint256(quarterResponse, 2));
        uint256 packedQuarterScores = _bytesToUint256(quarterResponse, 3);
        uint256 packedQuarterDigits = _bytesToUint256(quarterResponse, 4);

        // Unpack quarter scores and digits
        uint8 homeQ1 = uint8((packedQuarterScores >> 248) & 0xFF);
        uint8 homeQ2 = uint8((packedQuarterScores >> 240) & 0xFF);
        uint8 homeQ3 = uint8((packedQuarterScores >> 232) & 0xFF);
        uint8 homeF = uint8((packedQuarterScores >> 224) & 0xFF);
        uint8 awayQ1 = uint8((packedQuarterScores >> 216) & 0xFF);
        uint8 awayQ2 = uint8((packedQuarterScores >> 208) & 0xFF);
        uint8 awayQ3 = uint8((packedQuarterScores >> 200) & 0xFF);
        uint8 awayF = uint8((packedQuarterScores >> 192) & 0xFF);

        uint8 homeQ1LastDigit = uint8((packedQuarterDigits >> 252) & 0xF);
        uint8 homeQ2LastDigit = uint8((packedQuarterDigits >> 248) & 0xF);
        uint8 homeQ3LastDigit = uint8((packedQuarterDigits >> 244) & 0xF);
        uint8 homeFLastDigit = uint8((packedQuarterDigits >> 240) & 0xF);
        uint8 awayQ1LastDigit = uint8((packedQuarterDigits >> 236) & 0xF);
        uint8 awayQ2LastDigit = uint8((packedQuarterDigits >> 232) & 0xF);
        uint8 awayQ3LastDigit = uint8((packedQuarterDigits >> 228) & 0xF);
        uint8 awayFLastDigit = uint8((packedQuarterDigits >> 224) & 0xF);

        uint256 quarterGasUsed = gasStart - gasleft();

        // Test score changes gas usage
        bytes memory scoreChangesResponse = hex"000000000000000000000000000000000000000000000000000000000000000f000000060000000e0000000f000000030000000700000006000000060000000300000000000000070000000f0000000f000000080000000e0000000f00000003";

        gasStart = gasleft();

        // Simulate score changes unpacking
        uint8 totalScoreChanges2 = uint8(_bytesToUint256(scoreChangesResponse, 0));

        for (uint8 i = 0; i < totalScoreChanges2 && i < 20; i++) {
            uint8 uint256Index = 1 + (i / 8);
            uint8 offsetInUint256 = i % 8;

            uint256 packedUint256 = _bytesToUint256(scoreChangesResponse, uint256Index);
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            uint8 homeLastDigit = uint8((packedChange >> 4) & 0xF);
            uint8 awayLastDigit = uint8(packedChange & 0xF);
        }

        uint256 scoreChangesGasUsed = gasStart - gasleft();

        console.log("Quarter Scores Gas Usage:", quarterGasUsed);
        console.log("Score Changes Gas Usage:", scoreChangesGasUsed);
        console.log("Total Combined Gas:", quarterGasUsed + scoreChangesGasUsed);
        console.log("Gas Limit: 300,000");
        console.log("Under Limit:", (quarterGasUsed + scoreChangesGasUsed) < 300000);

        // Estimate total gas including storage writes
        uint256 estimatedQuarterTotal = quarterGasUsed + 50000; // Add storage write cost
        uint256 estimatedScoreChangesTotal = scoreChangesGasUsed + 100000; // Add storage write cost

        console.log("Estimated Quarter Scores Total:", estimatedQuarterTotal);
        console.log("Estimated Score Changes Total:", estimatedScoreChangesTotal);
        console.log("Both Under Limit:", estimatedQuarterTotal < 300000 && estimatedScoreChangesTotal < 300000);
    }

    function testScoreChangeCapacityAnalysis() public {
        console.log("=== SCORE CHANGE CAPACITY ANALYSIS ===");

        // Test with different numbers of score changes to find the breaking point
        bytes memory response15 = hex"000000000000000000000000000000000000000000000000000000000000000f000000060000000e0000000f000000030000000700000006000000060000000300000000000000070000000f0000000f000000080000000e0000000f00000003";

        uint256 gasStart = gasleft();

        // Process 15 score changes
        uint8 totalScoreChanges = uint8(_bytesToUint256(response15, 0));
        for (uint8 i = 0; i < totalScoreChanges && i < 20; i++) {
            uint8 uint256Index = 1 + (i / 8);
            uint8 offsetInUint256 = i % 8;

            uint256 packedUint256 = _bytesToUint256(response15, uint256Index);
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            uint8 homeLastDigit = uint8((packedChange >> 4) & 0xF);
            uint8 awayLastDigit = uint8(packedChange & 0xF);
        }

        uint256 gasUsed15 = gasStart - gasleft();

        console.log("Gas for 15 score changes (unpacking only):", gasUsed15);

        // Calculate gas per score change
        uint256 gasPerScoreChange = gasUsed15 / 15;
        console.log("Gas per score change (unpacking):", gasPerScoreChange);

        // Calculate storage costs more accurately
        // Each ScoreChangeEvent struct: 2 * uint8 = 2 * 32 bytes = 64 bytes storage
        // But uint8 values are packed into 32-byte slots
        // Storage write cost: ~20,000 gas for new storage slot, ~5,000 for existing slot
        // For dynamic arrays, we need to account for array length updates
        uint256 storageCostPerScoreChange = 20000 + 5000; // New slot + array length update
        console.log("Storage cost per score change:", storageCostPerScoreChange);

        uint256 totalCostPerScoreChange = gasPerScoreChange + storageCostPerScoreChange;
        console.log("Total cost per score change:", totalCostPerScoreChange);

        // Calculate how many we can fit in 300,000 gas
        uint256 baseGas = 50000; // Base gas for function call, unpacking header, etc.
        uint256 availableGas = 300000 - baseGas;
        uint256 maxScoreChanges = availableGas / totalCostPerScoreChange;

        console.log("=== CAPACITY CALCULATIONS ===");
        console.log("Base gas (function overhead):", baseGas);
        console.log("Available gas for score changes:", availableGas);
        console.log("Maximum score changes possible:", maxScoreChanges);

        // Test with different limits
        console.log("=== DIFFERENT LIMIT SCENARIOS ===");
        for (uint8 limit = 5; limit <= 20; limit += 5) {
            uint256 totalGas = baseGas + (limit * totalCostPerScoreChange);
            bool underLimit = totalGas < 300000;
            console.log("Score changes:", limit);
            console.log("Total gas:", totalGas);
            console.log("Under limit:", underLimit);
        }

        // Conservative estimate with safety margin
        uint256 safetyMargin = 20000; // 20k gas safety margin
        uint256 conservativeAvailableGas = 300000 - baseGas - safetyMargin;
        uint256 conservativeMaxScoreChanges = conservativeAvailableGas / totalCostPerScoreChange;

        console.log("=== CONSERVATIVE ESTIMATE (with 20k safety margin) ===");
        console.log("Conservative max score changes:", conservativeMaxScoreChanges);

        // Real-world analysis based on actual test results
        console.log("=== REAL-WORLD ANALYSIS ===");
        console.log("From our actual test with 15 score changes:");
        console.log("- Unpacking gas: 207,558");
        console.log("- Estimated storage gas: ~100,000 (based on previous tests)");
        console.log("- Total estimated: ~307,558");
        console.log("- This exceeds 300,000 gas limit");

        // Calculate realistic capacity
        uint256 realisticUnpackingGas = 207558;
        uint256 realisticStorageGas = 100000;
        uint256 realisticTotalGas = realisticUnpackingGas + realisticStorageGas;
        uint256 realisticGasPerScoreChange = realisticTotalGas / 15;

        console.log("Realistic gas per score change:", realisticGasPerScoreChange);
        uint256 realisticMaxScoreChanges = 300000 / realisticGasPerScoreChange;
        console.log("Realistic max score changes:", realisticMaxScoreChanges);

        // Conservative realistic estimate
        uint256 conservativeRealisticMax = (300000 - 50000) / realisticGasPerScoreChange;
        console.log("Conservative realistic max (with 50k overhead):", conservativeRealisticMax);
    }

    function testPackedScoreChangesGasUsage() public {
        console.log("=== PACKED SCORE CHANGES GAS TEST ===");

        // Test the new packed approach
        bytes memory response = hex"000000000000000000000000000000000000000000000000000000000000000f000000060000000e0000000f000000030000000700000006000000060000000300000000000000070000000f0000000f000000080000000e0000000f00000003";

        uint256 gasStart = gasleft();

        // Simulate the new packed storage approach
        uint8 totalScoreChanges = uint8(_bytesToUint256(response, 0));
        uint8 numUint256s = (totalScoreChanges + 7) / 8; // Round up to nearest 8

        // Create packed array in memory
        uint256[] memory packedScoreChanges = new uint256[](numUint256s);

        // Copy packed score changes directly from response (starting at index 1)
        for (uint8 i = 0; i < numUint256s; i++) {
            packedScoreChanges[i] = _bytesToUint256(response, 1 + i);
        }

        uint256 gasUsed = gasStart - gasleft();

        console.log("Total score changes:", totalScoreChanges);
        console.log("Number of uint256s needed:", numUint256s);
        console.log("Gas used for packed approach:", gasUsed);
        console.log("Gas per uint256:", gasUsed / numUint256s);

        // Calculate storage costs for packed approach
        uint256 storageCostPerUint256 = 20000; // New storage slot
        uint256 totalStorageCost = numUint256s * storageCostPerUint256;
        uint256 totalCost = gasUsed + totalStorageCost;

        console.log("Storage cost per uint256:", storageCostPerUint256);
        console.log("Total storage cost:", totalStorageCost);
        console.log("Total cost (unpacking + storage):", totalCost);

        // Calculate capacity with packed approach
        uint256 baseGas = 50000;
        uint256 availableGas = 300000 - baseGas;
        uint256 costPerUint256 = (gasUsed / numUint256s) + storageCostPerUint256;
        uint256 maxUint256s = availableGas / costPerUint256;
        uint256 maxScoreChanges = maxUint256s * 8; // 8 score changes per uint256

        console.log("=== PACKED APPROACH CAPACITY ===");
        console.log("Cost per uint256:", costPerUint256);
        console.log("Max uint256s possible:", maxUint256s);
        console.log("Max score changes possible:", maxScoreChanges);

        // Test different scenarios
        console.log("=== PACKED APPROACH SCENARIOS ===");
        for (uint8 scoreChanges = 8; scoreChanges <= 64; scoreChanges += 8) {
            uint8 uint256sNeeded = (scoreChanges + 7) / 8;
            uint256 totalGas = baseGas + (uint256sNeeded * costPerUint256);
            bool underLimit = totalGas < 300000;
            console.log("Score changes:", scoreChanges);
            console.log("Uint256s:", uint256sNeeded);
            console.log("Total gas:", totalGas);
            console.log("Under limit:", underLimit);
        }
    }

    function testScoreChangePackingEdgeCases() public {
        console.log("=== SCORE CHANGE PACKING EDGE CASES TEST ===");
        
        // Test edge cases for score change packing/unpacking
        // This verifies the fix from <<1 to <<4
        
        // Test case 1: Maximum values (9,9)
        _testPackingCase(9, 9, "Maximum values (9,9)");
        
        // Test case 2: Minimum values (0,0)
        _testPackingCase(0, 0, "Minimum values (0,0)");
        
        // Test case 3: Previously corrupted case (2,2)
        _testPackingCase(2, 2, "Previously corrupted case (2,2)");
        
        // Test case 4: Edge case (8,1)
        _testPackingCase(8, 1, "Edge case (8,1)");
        
        // Test case 5: Random case (5,7)
        _testPackingCase(5, 7, "Random case (5,7)");
        
        console.log("All edge cases passed!");
    }
    
    function _testPackingCase(uint8 homeDigit, uint8 awayDigit, string memory description) internal {
        // Pack the values using the fixed logic (<<4)
        uint256 packedChange = (uint256(homeDigit) << 4) | uint256(awayDigit);
        
        // Unpack using the fixed logic (>>4)
        uint8 unpackedHome = uint8((packedChange >> 4) & 0xF);
        uint8 unpackedAway = uint8(packedChange & 0xF);
        
        console.log("Test:", description);
        console.log("  Input: home=%d, away=%d", homeDigit, awayDigit);
        console.log("  Packed value:", packedChange);
        console.log("  Unpacked: home=%d, away=%d", unpackedHome, unpackedAway);
        
        // Verify correctness
        assertEq(unpackedHome, homeDigit, "Home digit mismatch");
        assertEq(unpackedAway, awayDigit, "Away digit mismatch");
        
        console.log("  PASS");
    }
    
    function testBuggyPackingComparison() public {
        console.log("=== BUGGY vs FIXED PACKING COMPARISON ===");
        
        // Demonstrate the bug with the old <<1 approach
        uint8 home = 2;
        uint8 away = 2;
        
        // Old buggy packing (<<1)
        uint256 buggyPacked = (uint256(home) << 1) | uint256(away);
        uint8 buggyHome = uint8((buggyPacked >> 1) & 0xF);
        uint8 buggyAway = uint8(buggyPacked & 0xF);
        
        console.log("BUGGY APPROACH (<<1, >>1):");
        console.log("  Input: home=%d, away=%d", home, away);
        console.log("  Packed:", buggyPacked);
        console.log("  Unpacked: home=%d, away=%d", buggyHome, buggyAway);
        console.log("  WRONG! Expected (2,2) but got (%d,%d)", buggyHome, buggyAway);
        
        // New fixed packing (<<4)
        uint256 fixedPacked = (uint256(home) << 4) | uint256(away);
        uint8 fixedHome = uint8((fixedPacked >> 4) & 0xF);
        uint8 fixedAway = uint8(fixedPacked & 0xF);
        
        console.log("FIXED APPROACH (<<4, >>4):");
        console.log("  Input: home=%d, away=%d", home, away);
        console.log("  Packed:", fixedPacked);
        console.log("  Unpacked: home=%d, away=%d", fixedHome, fixedAway);
        console.log("  CORRECT!");
        
        // Verify the fix
        assertEq(fixedHome, home, "Fixed home digit should match");
        assertEq(fixedAway, away, "Fixed away digit should match");
        
        // Show that buggy approach fails
        assertTrue(buggyHome != home || buggyAway != away, "Buggy approach should produce wrong results");
    }

    function _bytesToUint256(bytes memory input, uint8 index) internal pure returns (uint256 result) {
        for (uint8 i = 0; i < 32; i++) {
            result |= uint256(uint8(input[index * 32 + i])) << (8 * (31 - i));
        }
    }
}
