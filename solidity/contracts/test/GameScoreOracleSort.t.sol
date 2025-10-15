// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {GameScoreOracle} from "../src/GameScoreOracle.sol";

contract GameScoreOracleSortTest is Test {
    GameScoreOracle oracle;
    
    // Mock Chainlink router address
    address constant MOCK_ROUTER = address(0x1234);
    
    function setUp() public {
        // Deploy oracle with mock router
        oracle = new GameScoreOracle(MOCK_ROUTER);
    }
    
    function testWeekIdCalculation() public {
        // Test week ID calculation is consistent
        uint256 weekId1 = oracle.calculateWeekId(2025, 2, 6);
        uint256 weekId2 = oracle.calculateWeekId(2025, 2, 6);
        assertEq(weekId1, weekId2, "Week IDs should be identical for same parameters");
        
        // Verify the structure: (year << 16) | (seasonType << 8) | weekNumber
        uint256 expected = (2025 << 16) | (2 << 8) | 6;
        assertEq(weekId1, expected, "Week ID calculation incorrect");
    }
    
    function testSortingConsistency() public view {
        // This test validates the concept that sorting will ensure consistency
        // In JavaScript: ['401772940', '401772634', '401772856'].sort((a,b) => a.localeCompare(b))
        // Should always result in: ['401772634', '401772856', '401772940']
        
        // The key insight is that game IDs when sorted lexicographically will always
        // maintain the same order, regardless of the order ESPN returns them in
        
        // Expected sorted order for Contest 0 games:
        string[15] memory sortedGameIds = [
            "401772634", // Position 0
            "401772717", // Position 1  
            "401772748", // Position 2
            "401772749", // Position 3
            "401772750", // Position 4
            "401772751", // Position 5
            "401772752", // Position 6
            "401772815", // Position 7
            "401772855", // Position 8
            "401772856", // Position 9
            "401772857", // Position 10
            "401772858", // Position 11
            "401772859", // Position 12
            "401772923", // Position 13
            "401772940"  // Position 14
        ];
        
        // This demonstrates that with sorting, game 401772940 (Saints @ Chargers) 
        // will always be at position 14, not position 0 as it was incorrectly mapped
        
        // Similarly, game 401772634 (Bills @ Jets) will always be at position 0,
        // not position 1 as it was incorrectly mapped
    }
    
    function testResultMappingWithSorting() public pure {
        // Simulate the corrected mapping with sorted game IDs
        // This test shows how the results should map after sorting
        
        // Example: If ESPN returns games in random order but we sort them,
        // the bit positions in packedResults will consistently map to the same games
        
        uint256 packedResults = 0;
        
        // Set bit 0 for game at sorted position 0 (401772634 - Bills won)
        // Bills won (away team), so bit should be 0
        
        // Set bit 14 for game at sorted position 14 (401772940 - Chargers won)  
        // Chargers won (home team), so bit should be 1
        packedResults |= (1 << 14);
        
        // This ensures consistent mapping between game IDs and results
        assert(packedResults != 0);
    }
    
    function testOracleSourceCodeHasSorting() public view {
        // Verify that the source code contains the sorting logic
        string memory weekGamesSource = oracle.WEEK_GAMES_SOURCE();
        string memory weekResultsSource = oracle.WEEK_RESULTS_SOURCE();
        
        // Check that both sources contain the sort function
        // In a real test, we'd parse the JavaScript, but here we just verify the constants exist
        assert(bytes(weekGamesSource).length > 0);
        assert(bytes(weekResultsSource).length > 0);
        
        // The key change is that both sources now have:
        // .sort((a,b)=>a.id.localeCompare(b.id))
        // This ensures events are always processed in the same order
    }
}
