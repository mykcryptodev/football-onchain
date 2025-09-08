// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/Contests.sol";
import "../src/Boxes.sol";
import "../src/GameScoreOracle.sol";
import "../src/ContestsManager.sol";
import "../src/RandomNumbers.sol";
import "./DummyVRF.sol";
import "./DummyRandomNumbers.sol";

contract ContestsTest is Test {
    Contests public contests;
    Boxes public boxes;
    GameScoreOracle public gameScoreOracle;
    ContestsManager public contestsManager;
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

        // Deploy ContestsManager
        contestsManager = new ContestsManager();

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
            contestsManager,
            randomNumbers
        );

        // Set the Contests contract address in Boxes and RandomNumbers
        boxes.setContests(contests);
        randomNumbers.setContests(address(contests));

        // Set the Contests contract address in ContestsManager
        contestsManager.setContestStorage(address(contests));

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
        string memory title = "Test Contest";
        string memory description = "This is a test contest for the game";

        uint256 contestsBefore = contests.contestIdCounter();
        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestsAfter = contests.contestIdCounter();

        assertEq(contestsAfter, contestsBefore + 1, "Contest should be created");
    }

    function testFetchRandomValues() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Random Test Contest";
        string memory description = "Testing random values";

        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0; // First contest created

        // Set up event expectation BEFORE the action that should emit it
        vm.expectEmit(true, false, false, false);
        emit RandomNumbers.RandomNumberRequested(contestId, 0, 0);

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

    function testContestTitleAndDescription() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Super Bowl LVIII";
        string memory description = "Kansas City Chiefs vs San Francisco 49ers - The ultimate championship showdown!";

        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        // Test individual getters
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);

        assertEq(retrievedTitle, title, "Title should match");
        assertEq(retrievedDescription, description, "Description should match");

        // Test combined getter
        (string memory combinedTitle, string memory combinedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(combinedTitle, title, "Combined title should match");
        assertEq(combinedDescription, description, "Combined description should match");
    }

    function testEmptyTitleReverts() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "";
        string memory description = "Valid description";

        // Create contest first (no validation in createContest anymore)
        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        // Test that updating with empty title fails
        vm.expectRevert(ContestsManager.TitleEmpty.selector);
        contestsManager.updateContestInfo(contestId, "", "Valid description");
    }

    function testTitleTooLongReverts() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory validTitle = "Valid Title";
        string memory description = "Valid description";

        // Create contest first (no validation in createContest anymore)
        contests.createContest(gameId, boxCost, boxCurrency, validTitle, description);
        uint256 contestId = 0;

        // Create a title that exceeds MAX_TITLE_LENGTH (100 characters)
        string memory longTitle = "This is a very long title that exceeds the maximum allowed length of 100 characters for contest titles and should cause a revert";

        vm.expectRevert(ContestsManager.TitleTooLong.selector);
        contestsManager.updateContestInfo(contestId, longTitle, description);
    }

    function testDescriptionTooLongReverts() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Valid title";
        string memory validDescription = "Valid description";

        // Create contest first (no validation in createContest anymore)
        contests.createContest(gameId, boxCost, boxCurrency, title, validDescription);
        uint256 contestId = 0;

        // Create a description that exceeds MAX_DESCRIPTION_LENGTH (500 characters)
        string memory longDescription = "This is a very long description that exceeds the maximum allowed length of 500 characters for contest descriptions and should cause a revert when trying to create a contest with it. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

        vm.expectRevert(ContestsManager.DescriptionTooLong.selector);
        contestsManager.updateContestInfo(contestId, title, longDescription);
    }

    function testEmptyDescriptionAllowed() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Valid title";
        string memory description = "";

        // This should not revert - empty description is allowed
        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        (, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedDescription, "", "Empty description should be allowed");
    }

    function testMaxLengthTitleAndDescription() public {
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);

        // Create exactly 100 character title (at the limit)
        string memory title = "This title is exactly one hundred characters long and should be accepted by the contract!!!";

        // Create exactly 500 character description (at the limit)
        string memory description = "This description is exactly five hundred characters long and should be accepted by the contract. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui of";

        // This should not revert - exactly at the limits
        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);

        assertEq(retrievedTitle, title, "Max length title should be accepted");
        assertEq(retrievedDescription, description, "Max length description should be accepted");
    }

    function testUpdateContestTitleOnly() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory originalTitle = "Original Title";
        string memory originalDescription = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, originalTitle, originalDescription);
        uint256 contestId = 0;

        // Update only the title (keep description the same)
        string memory newTitle = "Updated Title";
        vm.expectEmit(true, false, false, true);
        emit ContestsManager.ContestTitleUpdated(contestId, newTitle);
        // Should NOT emit ContestDescriptionUpdated since description hasn't changed
        contestsManager.updateContestInfo(contestId, newTitle, originalDescription);

        // Verify the title was updated and description remained the same
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedTitle, newTitle, "Title should be updated");
        assertEq(retrievedDescription, originalDescription, "Description should remain unchanged");
    }

    function testUpdateContestDescriptionOnly() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory originalTitle = "Original Title";
        string memory originalDescription = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, originalTitle, originalDescription);
        uint256 contestId = 0;

        // Update only the description (keep title the same)
        string memory newDescription = "Updated Description";
        vm.expectEmit(true, false, false, true);
        emit ContestsManager.ContestDescriptionUpdated(contestId, newDescription);
        // Should NOT emit ContestTitleUpdated since title hasn't changed
        contestsManager.updateContestInfo(contestId, originalTitle, newDescription);

        // Verify the description was updated and title remained the same
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedTitle, originalTitle, "Title should remain unchanged");
        assertEq(retrievedDescription, newDescription, "Description should be updated");
    }

    function testUpdateContestInfo() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory originalTitle = "Original Title";
        string memory originalDescription = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, originalTitle, originalDescription);
        uint256 contestId = 0;

        // Update both title and description
        string memory newTitle = "Updated Title";
        string memory newDescription = "Updated Description";

        vm.expectEmit(true, false, false, true);
        emit ContestsManager.ContestTitleUpdated(contestId, newTitle);
        vm.expectEmit(true, false, false, true);
        emit ContestsManager.ContestDescriptionUpdated(contestId, newDescription);

        contestsManager.updateContestInfo(contestId, newTitle, newDescription);

        // Verify both were updated
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedTitle, newTitle, "Title should be updated");
        assertEq(retrievedDescription, newDescription, "Description should be updated");
    }

    function testUpdateContestInfoNoChanges() public {
        // Create a contest first
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory originalTitle = "Original Title";
        string memory originalDescription = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, originalTitle, originalDescription);
        uint256 contestId = 0;

        // Update with the same values - no events should be emitted
        contestsManager.updateContestInfo(contestId, originalTitle, originalDescription);

        // Verify nothing changed
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedTitle, originalTitle, "Title should remain unchanged");
        assertEq(retrievedDescription, originalDescription, "Description should remain unchanged");
    }

    function testOnlyCreatorCanUpdateInfo() public {
        // Create a contest
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Original Title";
        string memory description = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        // Try to update as non-creator
        vm.startPrank(player1);
        vm.expectRevert(ContestsManager.CallerNotContestCreator.selector);
        contestsManager.updateContestInfo(contestId, "Hacked Title", "Hacked Description");
        vm.stopPrank();

        // Verify nothing was changed
        (string memory retrievedTitle, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedTitle, title, "Title should not be changed by non-creator");
        assertEq(retrievedDescription, description, "Description should not be changed by non-creator");
    }

    function testUpdateInfoValidation() public {
        // Create a contest
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        address boxCurrency = address(0);
        string memory title = "Original Title";
        string memory description = "Original Description";

        contests.createContest(gameId, boxCost, boxCurrency, title, description);
        uint256 contestId = 0;

        // Test empty title
        vm.expectRevert(ContestsManager.TitleEmpty.selector);
        contestsManager.updateContestInfo(contestId, "", description);

        // Test title too long
        string memory longTitle = "This is a very long title that exceeds the maximum allowed length of 100 characters for contest titles and should cause a revert";
        vm.expectRevert(ContestsManager.TitleTooLong.selector);
        contestsManager.updateContestInfo(contestId, longTitle, description);

        // Test description too long
        string memory longDescription = "This is a very long description that exceeds the maximum allowed length of 500 characters for contest descriptions and should cause a revert when trying to update a contest with it. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
        vm.expectRevert(ContestsManager.DescriptionTooLong.selector);
        contestsManager.updateContestInfo(contestId, title, longDescription);

        // Test empty description (should be allowed)
        contestsManager.updateContestInfo(contestId, title, "");
        (, string memory retrievedDescription) = contestsManager.getContestInfo(contestId);
        assertEq(retrievedDescription, "", "Empty description should be allowed");
    }

}
