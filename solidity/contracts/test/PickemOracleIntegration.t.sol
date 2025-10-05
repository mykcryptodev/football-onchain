// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Pickem.sol";
import "../src/PickemNFT.sol";
import "../src/GameScoreOracle.sol";

contract PickemOracleIntegrationTest is Test {
    Pickem public pickem;
    PickemNFT public pickemNFT;
    GameScoreOracle public oracle;

    address public treasury = address(0x1234);
    address public functionsRouter = address(0x5678);
    address public alice = address(0xA11ce);
    address public bob = address(0xB0b);

    // Sample oracle response for week games
    bytes public weekGamesResponse = hex"0000000000000000000000000000000000000000000000000000000000000010000000000000005fca476400000000000002fe52ffe000000000000017f29e88000000000000005fca472c00000000000002fe523aa000000000000017f291ce000000000000005fca478c00000000000002fe52fd2000000000000017f291cf000000000000005fca477400000000000002fe523a2000000000000017f291c8000000000000005fca60b400000000000002fe523ac000000000000017f291ac000000000000005fca46b4000000000000000000000000000000000000000000";

    // Real results response from oracle for preseason week 3, 2025
    bytes public weekResultsResponse = hex"00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000005642";

    function setUp() public {
        // Deploy oracle
        oracle = new GameScoreOracle(functionsRouter);

        // Deploy Pickem and NFT contracts
        pickem = new Pickem(treasury, address(oracle));
        pickemNFT = new PickemNFT("NFL Pickem 2025", "PICKEM");
        pickem.setPickemNFT(address(pickemNFT));
        pickemNFT.setPickemContract(address(pickem));

        // Fund test accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function testCreateContestWithOracleGames() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        // First, we need to populate the oracle with week games
        // In reality, this would be done by calling fetchWeekGames with Chainlink
        MockGameScoreOracle mockOracle = new MockGameScoreOracle(functionsRouter);
        mockOracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Deploy new Pickem with mock oracle
        Pickem pickemWithMock = new Pickem(treasury, address(mockOracle));

        // Create contest - should fetch games from oracle
        vm.startPrank(alice);
        uint256 contestId = pickemWithMock.createContest(
            seasonType,
            weekNumber,
            year,
            address(0), // ETH
            0.01 ether, // entry fee
            0, // winner-take-all
            0 // use default deadline
        );
        vm.stopPrank();

        // Verify contest was created with correct data
        assertEq(pickemWithMock.nextContestId() - 1, contestId, "Contest ID should match");

        // Get game IDs from the created contest
        uint256[] memory gameIds = pickemWithMock.getContestGameIds(contestId);
        assertEq(gameIds.length, 16, "Should have 16 games from oracle");
        assertEq(gameIds[0], 401773017, "First game ID should match");
    }

    function testSubmitPredictionsAndCalculateWinners() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        // Setup oracle with games
        MockGameScoreOracle mockOracle = new MockGameScoreOracle(functionsRouter);
        mockOracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Deploy Pickem with mock oracle
        Pickem pickemWithMock = new Pickem(treasury, address(mockOracle));
        PickemNFT nft = new PickemNFT("NFL Pickem 2025", "PICKEM");
        pickemWithMock.setPickemNFT(address(nft));
        nft.setPickemContract(address(pickemWithMock));

        // Create contest
        vm.startPrank(alice);
        uint256 contestId = pickemWithMock.createContest(
            seasonType,
            weekNumber,
            year,
            address(0), // ETH
            0.01 ether,
            0, // winner-take-all
            block.timestamp + 1 days // custom deadline
        );
        vm.stopPrank();

        // Alice submits predictions (matches actual results exactly)
        // Real results: [0,1,0,0,0,0,1,0,0,1,1,0,1,0,1,0]
        uint8[] memory alicePicks = new uint8[](16);
        alicePicks[0] = 0;  // away
        alicePicks[1] = 1;  // home
        alicePicks[2] = 0;  // away
        alicePicks[3] = 0;  // away
        alicePicks[4] = 0;  // away
        alicePicks[5] = 0;  // away
        alicePicks[6] = 1;  // home
        alicePicks[7] = 0;  // away
        alicePicks[8] = 0;  // away
        alicePicks[9] = 1;  // home
        alicePicks[10] = 1; // home
        alicePicks[11] = 0; // away
        alicePicks[12] = 1; // home
        alicePicks[13] = 0; // away
        alicePicks[14] = 1; // home
        alicePicks[15] = 0; // away

        vm.startPrank(alice);
        uint256 aliceTokenId = pickemWithMock.submitPredictions{value: 0.01 ether}(
            contestId,
            alicePicks,
            300 // tiebreaker points
        );
        vm.stopPrank();

        // Bob submits predictions (mostly wrong)
        uint8[] memory bobPicks = new uint8[](16);
        for (uint i = 0; i < 16; i++) {
            bobPicks[i] = 1; // all home wins (will get 6 correct)
        }

        vm.startPrank(bob);
        uint256 bobTokenId = pickemWithMock.submitPredictions{value: 0.01 ether}(
            contestId,
            bobPicks,
            280 // tiebreaker points
        );
        vm.stopPrank();

        // Fast forward past deadline
        vm.warp(block.timestamp + 2 days);

        // Update oracle with results
        mockOracle.exposedFulfillWeekResultsRequest(weekId, weekResultsResponse);

        // Update contest results
        pickemWithMock.updateContestResults(contestId);

        // Verify winners were calculated
        uint256[] memory winners = pickemWithMock.getContestWinners(contestId);
        assertEq(winners.length, 1, "Should have 1 winner");

        // Alice should win (16 correct vs Bob's 6 correct)
        assertEq(winners[0], aliceTokenId, "Alice should be the winner");

        // Verify scores were updated
        (,,,, uint256 aliceScore,) = pickemWithMock.predictions(aliceTokenId);
        (,,,, uint256 bobScore,) = pickemWithMock.predictions(bobTokenId);

        assertEq(aliceScore, 16, "Alice should have perfect score");
        assertEq(bobScore, 6, "Bob should have 6 correct picks (home wins)");
    }

    function testMultipleEntriesPerUser() public {
        uint256 year = 2025;
        uint8 seasonType = 1;
        uint8 weekNumber = 3;
        uint256 weekId = (year << 16) | (seasonType << 8) | weekNumber;

        // Setup oracle
        MockGameScoreOracle mockOracle = new MockGameScoreOracle(functionsRouter);
        mockOracle.exposedFulfillWeekGamesRequest(weekId, weekGamesResponse);

        // Deploy contracts
        Pickem pickemWithMock = new Pickem(treasury, address(mockOracle));
        PickemNFT nft = new PickemNFT("NFL Pickem 2025", "PICKEM");
        pickemWithMock.setPickemNFT(address(nft));
        nft.setPickemContract(address(pickemWithMock));

        // Create contest
        vm.prank(alice);
        uint256 contestId = pickemWithMock.createContest(
            seasonType,
            weekNumber,
            year,
            address(0),
            0.01 ether,
            0,
            block.timestamp + 1 days
        );

        // Alice submits 3 different entries
        uint8[] memory picks1 = new uint8[](16);
        uint8[] memory picks2 = new uint8[](16);
        uint8[] memory picks3 = new uint8[](16);

        for (uint i = 0; i < 16; i++) {
            picks1[i] = 1; // all home
            picks2[i] = 0; // all away
            picks3[i] = uint8(i % 2); // alternating
        }

        vm.startPrank(alice);
        uint256 token1 = pickemWithMock.submitPredictions{value: 0.01 ether}(contestId, picks1, 100);
        uint256 token2 = pickemWithMock.submitPredictions{value: 0.01 ether}(contestId, picks2, 200);
        uint256 token3 = pickemWithMock.submitPredictions{value: 0.01 ether}(contestId, picks3, 300);
        vm.stopPrank();

        // Verify all tokens are tracked
        uint256[] memory aliceTokens = pickemWithMock.getUserTokensForContest(contestId, alice);
        assertEq(aliceTokens.length, 3, "Alice should have 3 tokens");
        assertEq(aliceTokens[0], token1, "First token should match");
        assertEq(aliceTokens[1], token2, "Second token should match");
        assertEq(aliceTokens[2], token3, "Third token should match");

        // Verify NFT ownership
        assertEq(nft.ownerOf(token1), alice, "Alice should own token1");
        assertEq(nft.ownerOf(token2), alice, "Alice should own token2");
        assertEq(nft.ownerOf(token3), alice, "Alice should own token3");
        assertEq(nft.balanceOf(alice), 3, "Alice should own 3 NFTs");
    }
}

// Mock oracle that exposes internal functions
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
