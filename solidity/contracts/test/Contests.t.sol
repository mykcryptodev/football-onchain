// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/Contests.sol";
import "../src/Boxes.sol";
import "../src/GameScoreOracle.sol";
import "../src/ContestsReader.sol";
import "../src/RandomNumbers.sol";
import "./DummyVRF.sol";
import "./DummyRandomNumbers.sol";

contract ContestsTest is Test {
    Contests public contests;
    Boxes public boxes;
    GameScoreOracle public gameScoreOracle;
    ContestsReader public contestsReader;
    DummyRandomNumbers public randomNumbers;
    DummyVRF public dummyVRF;

    address public treasury = address(1);
    address public player1 = address(2);
    address public player2 = address(3);

    uint96 constant FUND_AMOUNT = 1 ether;
    uint32 constant CALLBACK_GAS_LIMIT = 100000;
    uint32 constant NUM_WORDS = 2;
    uint16 constant REQUEST_CONFIRMATIONS = 3;
    uint256 constant VRF_FEE = 0.001 ether;

    function setUp() public {
        // Deploy dummy VRF
        dummyVRF = new DummyVRF();

        // Deploy Boxes contract
        boxes = new Boxes();

        // Deploy ContestsReader
        contestsReader = new ContestsReader();

        // Deploy GameScoreOracle
        gameScoreOracle = new GameScoreOracle(
            address(dummyVRF) // not really the router, but it's fine for testing
        );

        // Deploy RandomNumbers contract
        randomNumbers = new DummyRandomNumbers(
            address(dummyVRF)
        );

        // Deploy Contests contract
        contests = new Contests(
            treasury,
            boxes,
            gameScoreOracle,
            contestsReader,
            randomNumbers
        );

        // Set the Contests contract address in Boxes and RandomNumbers
        boxes.setContests(contests);
        randomNumbers.setContests(address(contests));

        // Create and fund a subscription
        uint64 subId = dummyVRF.createSubscription();
        dummyVRF.fundSubscription(subId, FUND_AMOUNT);

        // Add consumer to subscription
        dummyVRF.addConsumer(subId, address(randomNumbers));
    }

    function testCreateContest() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0); // ETH

        uint256 contestsBefore = contests.contestIdCounter();
        contests.createContest(gameId, boxCost, boxCurrency);
        uint256 contestsAfter = contests.contestIdCounter();

        assertEq(contestsAfter, contestsBefore + 1, "Contest should be created");
    }

    function testFetchRandomValues() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        
        contests.createContest(gameId, boxCost, boxCurrency);
        uint256 contestId = 0; // First contest created

        // Set up event expectation BEFORE the action that should emit it
        vm.expectEmit(true, true, false, false);
        emit RandomNumbers.RandomNumberRequested(contestId, block.timestamp, VRF_FEE);
        
        // Try to fetch random values
        vm.deal(address(this), VRF_FEE);
        contests.fetchRandomValues{value: VRF_FEE}(contestId);

        // Simulate VRF callback
        uint256[] memory randomWords = new uint256[](2);
        randomWords[0] = 12345;
        randomWords[1] = 67890;

        // // Verify that the contest is no longer accepting box claims
        // (,,,,bool boxesCanBeClaimed,,,,) = contests.contests(contestId);
        // assertFalse(boxesCanBeClaimed, "Contest should not accept box claims after requesting random values");
    }

    // function testOnlyCreatorCanFetchRandomValues() public {
    //     // Create a contest
    //     uint256 gameId = 1;
    //     uint256 boxCost = 0.1 ether;
    //     address boxCurrency = address(0);
        
    //     contests.createContest(gameId, boxCost, boxCurrency);
    //     uint256 contestId = 0;

    //     // Try to fetch random values as non-creator
    //     vm.deal(player1, VRF_FEE);
    //     vm.startPrank(player1);
    //     vm.expectRevert(Contests.CallerNotContestCreator.selector);
    //     contests.fetchRandomValues{value: VRF_FEE}(contestId);
    //     vm.stopPrank();
    // }
}
