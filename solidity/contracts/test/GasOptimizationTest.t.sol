// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/GameScoreOracle.sol";

contract MockGameScoreOracle is GameScoreOracle {
    constructor(address _functionsRouter) GameScoreOracle(_functionsRouter) {}

    function exposedFulfillWeekGamesRequest(uint256 weekId, bytes memory response) external {
        _fulfillWeekGamesRequest(weekId, response);
    }

    function exposedFulfillWeekResultsRequest(uint256 weekId, bytes memory response) external {
        _fulfillWeekResultsRequest(weekId, response);
    }
}

contract GasOptimizationTest is Test {
    MockGameScoreOracle oracle;
    address functionsRouter = address(0x1234);

    // Sample oracle response for week games (16 games)
    bytes public weekGamesResponse = hex"0000000000000000000000000000000000000000000000000000000000000010000000000000005fca476400000000000002fe52ffe000000000000017f29e88000000000000005fca472c00000000000002fe523aa000000000000017f291ce000000000000005fca478c00000000000002fe52fd2000000000000017f291cf000000000000005fca477400000000000002fe523a2000000000000017f291c8000000000000005fca60b400000000000002fe523ac000000000000017f291ac000000000000005fca46b4000000000000000000000000000000000000000000";

    function setUp() public {
        oracle = new MockGameScoreOracle(functionsRouter);
    }

    function testWeekGamesGasUsage() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        uint256 gasStart = gasleft();

        // Call the fulfillment function directly
        oracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for week games fulfillment:", gasUsed);

        // Verify the gas usage is under 300k
        assertLt(gasUsed, 300000, "Gas usage exceeds 300k limit");

        // Verify data was stored correctly
        (uint256[] memory gameIds, uint256 earliestKickoff) = oracle.getWeekGames(year, seasonType, weekNumber);
        assertEq(gameIds.length, 16, "Should have 16 games");
        assertEq(gameIds[0], 401773017, "First game ID should match");
    }

    function testWeekResultsGasUsage() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        // First fulfill week games
        oracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Sample results response
        bytes memory weekResultsResponse = hex"00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000005642";

        uint256 gasStart = gasleft();

        // Call the fulfillment function directly
        oracle.exposedFulfillWeekResultsRequest(weekId, weekResultsResponse);

        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for week results fulfillment:", gasUsed);

        // Verify the gas usage is under 300k
        assertLt(gasUsed, 300000, "Gas usage exceeds 300k limit");

        // Verify data was stored correctly
        uint8[] memory winners = oracle.getWeekResults(year, seasonType, weekNumber);
        assertEq(winners.length, 16, "Should have 16 results");
    }
}
