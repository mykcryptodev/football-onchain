// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/GameScoreOracle.sol";

contract GameScoreOracleTest is Test {
    GameScoreOracle public oracle;

    // Mock oracle owner and functions router addresses
    address public owner = address(0x1);
    address public functionsRouter = address(0x2);

    // Sample response from the oracle for week 3, preseason 2025
    bytes public weekGamesResponse = hex"0000000000000000000000000000000000000000000000000000000000000010000000000000005fca476400000000000002fe52ffe000000000000017f29e88000000000000005fca472c00000000000002fe523aa000000000000017f291ce000000000000005fca478c00000000000002fe52fd2000000000000017f291cf000000000000005fca477400000000000002fe523a2000000000000017f291c8000000000000005fca60b400000000000002fe523ac000000000000017f291ac000000000000005fca46b4000000000000000000000000000000000000000000";

    // Expected game IDs from the response
    uint256[] public expectedGameIds;

    function setUp() public {
        vm.startPrank(owner);
        oracle = new GameScoreOracle(functionsRouter);
        vm.stopPrank();

        // Initialize expected game IDs based on the actual oracle response
        // These are decoded from the hex response provided
        expectedGameIds.push(401773017);
        expectedGameIds.push(401774591);
        expectedGameIds.push(401776264);
        expectedGameIds.push(401773003);
        expectedGameIds.push(401773013);
        expectedGameIds.push(401773006);
        expectedGameIds.push(401773027);
        expectedGameIds.push(401774569);
        expectedGameIds.push(401773007);
        expectedGameIds.push(401773021);
        expectedGameIds.push(401773009);
        expectedGameIds.push(401773000);
        expectedGameIds.push(401774637);
        expectedGameIds.push(401773014);
        expectedGameIds.push(401772972);
        expectedGameIds.push(401772973);
    }

    function testFulfillWeekGamesRequest() public {
        uint256 year = 2025;
        uint8 seasonType = 1; // Preseason
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        // Simulate oracle fulfillment by directly calling the internal function
        // We need to use a mock contract that exposes the internal function
        MockGameScoreOracle mockOracle = new MockGameScoreOracle(functionsRouter);

        // Call the fulfillment function
        mockOracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Get the stored games
        (uint256[] memory gameIds, uint256 submissionDeadline) = mockOracle.getWeekGames(year, seasonType, weekNumber);

        // Verify game count
        assertEq(gameIds.length, 16, "Should have 16 games");

        // Verify submission deadline is set
        assertGt(submissionDeadline, block.timestamp, "Submission deadline should be in the future");

        // Log the unpacked game IDs for debugging
        console.log("Unpacked game IDs:");
        for (uint i = 0; i < gameIds.length; i++) {
            console.log("Game", i, ":", gameIds[i]);
        }

        // Verify specific game IDs match expected values
        assertEq(gameIds[0], expectedGameIds[0], "First game ID should match");
        assertEq(gameIds[1], expectedGameIds[1], "Second game ID should match");
        assertEq(gameIds[15], expectedGameIds[15], "Last game ID should match");
    }

    function testPackingAndUnpacking() public {
        // Test the packing logic matches what the oracle JavaScript returns
        uint256[] memory testIds = new uint256[](3);
        testIds[0] = 401773017; // 0x17F29E59
        testIds[1] = 401774591; // 0x17F2A3FF
        testIds[2] = 401776264; // 0x17F2AA88

        // Pack these 3 IDs as the oracle JavaScript would
        // Bits 170-254: ID 0
        // Bits 85-169: ID 1
        // Bits 0-84: ID 2
        uint256 packed = (uint256(testIds[0]) << 170) | (uint256(testIds[1]) << 85) | uint256(testIds[2]);

        // Unpack and verify
        uint256 id0 = (packed >> 170) & ((1 << 85) - 1);
        uint256 id1 = (packed >> 85) & ((1 << 85) - 1);
        uint256 id2 = packed & ((1 << 85) - 1);

        assertEq(id0, testIds[0], "First unpacked ID should match");
        assertEq(id1, testIds[1], "Second unpacked ID should match");
        assertEq(id2, testIds[2], "Third unpacked ID should match");
    }

    function testWeekResultsFulfillment() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        MockGameScoreOracle mockOracle = new MockGameScoreOracle(functionsRouter);

        // First fulfill week games
        mockOracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Use actual oracle response for week results
        // This is the real response from the ESPN API for preseason week 3, 2025
        bytes memory weekResultsResponse = hex"00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000005642";

        // Fulfill week results
        mockOracle.exposedFulfillWeekResultsRequest(weekId, weekResultsResponse);

        // Get the results
        uint8[] memory winners = mockOracle.getWeekResults(year, seasonType, weekNumber);

        // Verify results
        assertEq(winners.length, 16, "Should have 16 results");

        // Verify actual results from the oracle response
        // Binary of 0x5642: 0101011001000010
        // Reading from LSB: [0,1,0,0,0,0,1,0,0,1,1,0,1,0,1,0]
        uint8[] memory expectedWinners = new uint8[](16);
        expectedWinners[0] = 0; // away
        expectedWinners[1] = 1; // home
        expectedWinners[2] = 0; // away
        expectedWinners[3] = 0; // away
        expectedWinners[4] = 0; // away
        expectedWinners[5] = 0; // away
        expectedWinners[6] = 1; // home
        expectedWinners[7] = 0; // away
        expectedWinners[8] = 0; // away
        expectedWinners[9] = 1; // home
        expectedWinners[10] = 1; // home
        expectedWinners[11] = 0; // away
        expectedWinners[12] = 1; // home
        expectedWinners[13] = 0; // away
        expectedWinners[14] = 1; // home
        expectedWinners[15] = 0; // away

        for (uint i = 0; i < 16; i++) {
            assertEq(winners[i], expectedWinners[i], string(abi.encodePacked("Game ", vm.toString(i), " winner should match")));
        }

        // Verify summary: 6 home wins, 10 away wins
        uint256 homeWins = 0;
        for (uint i = 0; i < winners.length; i++) {
            if (winners[i] == 1) homeWins++;
        }
        assertEq(homeWins, 6, "Should have 6 home wins");
        assertEq(winners.length - homeWins, 10, "Should have 10 away wins");
    }

    function testEmptyWeekGames() public {
        uint256 year = 2025;
        uint8 seasonType = 2; // Different season that hasn't been fetched
        uint8 weekNumber = 5;

        // Get games for unfetched week
        (uint256[] memory gameIds, uint256 submissionDeadline) = oracle.getWeekGames(year, seasonType, weekNumber);

        // Should return empty array and 0 deadline
        assertEq(gameIds.length, 0, "Should return empty array for unfetched week");
        assertEq(submissionDeadline, 0, "Should return 0 deadline for unfetched week");
    }
}

// Mock contract to expose internal functions for testing
contract MockGameScoreOracle is GameScoreOracle {
    constructor(address _router) GameScoreOracle(_router) {}

    function exposedFulfillWeekGamesRequest(
        uint256 weekId,
        bytes memory response
    ) external {
        _fulfillWeekGamesRequest(weekId, response);
    }

    function exposedFulfillWeekResultsRequest(
        uint256 weekId,
        bytes memory response
    ) external {
        _fulfillWeekResultsRequest(weekId, response);
    }
}
