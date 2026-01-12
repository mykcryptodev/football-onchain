// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/Contests.sol";
import "../src/Boxes.sol";
import "../src/GameScoreOracle.sol";
import "../src/ContestsManager.sol";
import "../src/RandomNumbers.sol";
import "../src/QuartersOnlyPayoutStrategy.sol";
import "../src/ScoreChangesPayoutStrategy.sol";
import "../src/IPayoutStrategy.sol";
import "./DummyVRF.sol";
import "./DummyRandomNumbers.sol";

/**
 * @title PayoutStrategyIntegrationTest
 * @notice Integration tests for payout strategies that verify correct box owner resolution
 * 
 * These tests verify that:
 * 1. Payout strategies correctly map home/away scores to row/col positions
 * 2. getBoxOwner is called with correct parameters (homeLastDigit, awayLastDigit)
 * 3. Winners match the expected box owners based on contest.rows and contest.cols
 */
contract MockGameScoreOracle is GameScoreOracle {
    constructor(address _router) GameScoreOracle(_router) {}

    function exposedFulfillQuarterScoresRequest(
        uint256 gameId,
        bytes memory response,
        bytes32 requestId
    ) external {
        _fulfillQuarterScoresRequest(gameId, response, requestId);
    }

    function exposedFulfillScoreChangesRequest(
        uint256 gameId,
        bytes memory response,
        bytes32 requestId
    ) external {
        _fulfillScoreChangesRequest(gameId, response, requestId);
    }
}

contract PayoutStrategyIntegrationTest is Test {
    Contests public contests;
    Boxes public boxes;
    MockGameScoreOracle public gameScoreOracle;
    ContestsManager public contestsManager;
    DummyRandomNumbers public randomNumbers;
    DummyVRF public dummyVRF;
    QuartersOnlyPayoutStrategy public quartersOnlyStrategy;
    ScoreChangesPayoutStrategy public scoreChangesStrategy;

    address public treasury = address(1);
    address public player1 = address(0x1111); // Will own box at row 4, col 1
    address public player2 = address(0x2222); // Will own box at row 6, col 7
    address public player3 = address(0x3333); // Will own box at row 3, col 0

    uint96 constant FUND_AMOUNT = 1 ether;
    uint256 constant VRF_FEE = 0.001 ether;
    uint256 constant BOX_COST = 0.1 ether;

    function setUp() public {
        // Deploy dummy VRF
        dummyVRF = new DummyVRF();

        // Deploy Boxes contract
        boxes = new Boxes();

        // Deploy ContestsManager
        contestsManager = new ContestsManager();

        // Deploy GameScoreOracle
        gameScoreOracle = new MockGameScoreOracle(address(dummyVRF));

        // Deploy RandomNumbers contract
        randomNumbers = new DummyRandomNumbers(address(dummyVRF));

        // Deploy Payout Strategy contracts
        quartersOnlyStrategy = new QuartersOnlyPayoutStrategy();
        scoreChangesStrategy = new ScoreChangesPayoutStrategy();

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
        dummyVRF.addConsumer(subId, address(randomNumbers));

        // Fund players
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(player3, 10 ether);
    }

    /**
     * @dev Helper to create a packed game scores response
     * Format: [qComplete(1), gameCompleted(1), totalScoreChanges(1), packedQuarterScores(1), packedQuarterDigits(1)]
     */
    function _createQuarterScoresResponse(
        uint8 qComplete,
        bool gameCompleted,
        uint8 totalScoreChanges,
        uint8 homeQ1,
        uint8 homeQ2,
        uint8 homeQ3,
        uint8 homeF,
        uint8 awayQ1,
        uint8 awayQ2,
        uint8 awayQ3,
        uint8 awayF,
        uint8 homeQ1LastDigit,
        uint8 homeQ2LastDigit,
        uint8 homeQ3LastDigit,
        uint8 homeFLastDigit,
        uint8 awayQ1LastDigit,
        uint8 awayQ2LastDigit,
        uint8 awayQ3LastDigit,
        uint8 awayFLastDigit
    ) internal pure returns (bytes memory) {
        // Pack quarter scores: homeQ1(8) + homeQ2(8) + homeQ3(8) + homeF(8) + awayQ1(8) + awayQ2(8) + awayQ3(8) + awayF(8)
        uint256 packedQuarterScores = (uint256(homeQ1) << 248) |
            (uint256(homeQ2) << 240) |
            (uint256(homeQ3) << 232) |
            (uint256(homeF) << 224) |
            (uint256(awayQ1) << 216) |
            (uint256(awayQ2) << 208) |
            (uint256(awayQ3) << 200) |
            (uint256(awayF) << 192);

        // Pack quarter digits: homeQ1(4) + homeQ2(4) + homeQ3(4) + homeF(4) + awayQ1(4) + awayQ2(4) + awayQ3(4) + awayF(4)
        uint256 packedQuarterDigits = (uint256(homeQ1LastDigit) << 252) |
            (uint256(homeQ2LastDigit) << 248) |
            (uint256(homeQ3LastDigit) << 244) |
            (uint256(homeFLastDigit) << 240) |
            (uint256(awayQ1LastDigit) << 236) |
            (uint256(awayQ2LastDigit) << 232) |
            (uint256(awayQ3LastDigit) << 228) |
            (uint256(awayFLastDigit) << 224);

        bytes memory response = abi.encodePacked(
            uint256(qComplete),
            gameCompleted ? uint256(1) : uint256(0),
            uint256(totalScoreChanges),
            packedQuarterScores,
            packedQuarterDigits
        );

        return response;
    }

    /**
     * @dev Helper to create a packed score changes response
     * Format: [totalScoreChanges(1), packedScoreChanges...]
     * Each packedScoreChange: homeLastDigit(4) | awayLastDigit(4) in 32 bits
     */
    function _createScoreChangesResponse(
        uint8[] memory homeLastDigits,
        uint8[] memory awayLastDigits
    ) internal pure returns (bytes memory) {
        require(homeLastDigits.length == awayLastDigits.length, "Arrays must match");
        require(homeLastDigits.length <= 64, "Max 64 score changes");

        bytes memory response = abi.encodePacked(uint256(homeLastDigits.length));

        // Pack 8 score changes per uint256
        for (uint256 i = 0; i < homeLastDigits.length; i += 8) {
            uint256 packed = 0;
            for (uint256 j = 0; j < 8 && (i + j) < homeLastDigits.length; j++) {
                uint256 change = (uint256(homeLastDigits[i + j]) << 4) | uint256(awayLastDigits[i + j]);
                packed |= (change << (j * 32));
            }
            response = abi.encodePacked(response, packed);
        }

        return response;
    }

    /**
     * @dev Test QuartersOnlyPayoutStrategy with correct box owner resolution
     * 
     * Setup:
     * - Contest with rows = [0,1,2,3,4,5,6,7,8,9] (home team scores)
     * - Contest with cols = [0,1,2,3,4,5,6,7,8,9] (away team scores)
     * - Player1 owns box at row 4, col 1 (tokenId 41)
     * - Game Q1: home=4, away=1 → should match box at row 4, col 1
     * 
     * Expected: Player1 should win Q1 payout
     */
    function testQuartersOnlyPayoutStrategyCorrectBoxOwner() public {
        uint256 gameId = 401772980;
        uint256 contestId = 0;

        // 1. Create contest
        contests.createContest(
            gameId,
            BOX_COST,
            address(0),
            "Test Contest",
            "Test Description",
            address(quartersOnlyStrategy)
        );

        // 2. Claim specific boxes
        // Box 41 = row 4, col 1 (player1)
        // Box 67 = row 6, col 7 (player2)
        uint256[] memory tokenIds1 = new uint256[](1);
        tokenIds1[0] = 41; // row 4, col 1
        vm.prank(player1);
        contests.claimBoxes{value: BOX_COST}(tokenIds1, player1);

        uint256[] memory tokenIds2 = new uint256[](1);
        tokenIds2[0] = 67; // row 6, col 7
        vm.prank(player2);
        contests.claimBoxes{value: BOX_COST}(tokenIds2, player2);

        // 3. Set random values
        // rows = home team scores [0,1,2,3,4,5,6,7,8,9]
        // cols = away team scores [0,1,2,3,4,5,6,7,8,9]
        uint8[] memory rows = new uint8[](10);
        uint8[] memory cols = new uint8[](10);
        for (uint8 i = 0; i < 10; i++) {
            rows[i] = i;
            cols[i] = i;
        }
        vm.prank(address(randomNumbers));
        contests.fulfillRandomNumbers(contestId, rows, cols);

        // Verify box scores
        (uint256 rowScore, uint256 colScore) = contests.fetchBoxScores(contestId, 41);
        assertEq(rowScore, 4, "Box 41 row score should be 4");
        assertEq(colScore, 1, "Box 41 col score should be 1");

        // 4. Set up game scores in oracle
        // Q1: home=4, away=1 → homeLastDigit=4, awayLastDigit=1
        // This should match box at row 4, col 1 (player1's box)
        bytes memory quarterResponse = _createQuarterScoresResponse(
            1,    // qComplete: Q1 done
            false, // gameCompleted
            0,     // totalScoreChanges
            4,     // homeQ1
            0,     // homeQ2
            0,     // homeQ3
            0,     // homeF
            1,     // awayQ1
            0,     // awayQ2
            0,     // awayQ3
            0,     // awayF
            4,     // homeQ1LastDigit
            0,     // homeQ2LastDigit
            0,     // homeQ3LastDigit
            0,     // homeFLastDigit
            1,     // awayQ1LastDigit
            0,     // awayQ2LastDigit
            0,     // awayQ3LastDigit
            0      // awayFLastDigit
        );

        bytes32 requestId = bytes32(uint256(1));
        gameScoreOracle.exposedFulfillQuarterScoresRequest(gameId, quarterResponse, requestId);

        // 5. Calculate payouts
        uint256 totalPot = 2 * BOX_COST; // 2 boxes claimed
        uint256 totalPotAfterFee = totalPot - (totalPot * 20 / 1000); // 2% treasury fee

        IPayoutStrategy.PayoutInfo[] memory payouts = quartersOnlyStrategy.calculatePayouts(
            contestId,
            gameId,
            totalPotAfterFee,
            gameScoreOracle,
            contests.getBoxOwner
        );

        // 6. Verify Q1 winner is player1 (owns box 41 with row=4, col=1)
        assertEq(payouts.length, 1, "Should have 1 payout for Q1");
        assertEq(payouts[0].winner, player1, "Q1 winner should be player1 (box 41: row=4, col=1)");
        assertEq(payouts[0].quarter, 1, "Should be Q1 payout");
        assertEq(payouts[0].reason, "Q1 Winner", "Reason should be Q1 Winner");
    }

    /**
     * @dev Test ScoreChangesPayoutStrategy with correct box owner resolution
     * 
     * Setup:
     * - Player1 owns box at row 4, col 1
     * - Score change: home=4, away=1 → homeLastDigit=4, awayLastDigit=1
     * 
     * Expected: Player1 should win score change payout
     */
    function testScoreChangesPayoutStrategyCorrectBoxOwner() public {
        uint256 gameId = 401772980;
        uint256 contestId = 0;

        // 1. Create contest
        contests.createContest(
            gameId,
            BOX_COST,
            address(0),
            "Test Contest",
            "Test Description",
            address(scoreChangesStrategy)
        );

        // 2. Claim specific boxes
        uint256[] memory tokenIds1 = new uint256[](1);
        tokenIds1[0] = 41; // row 4, col 1
        vm.prank(player1);
        contests.claimBoxes{value: BOX_COST}(tokenIds1, player1);

        // 3. Set random values
        uint8[] memory rows = new uint8[](10);
        uint8[] memory cols = new uint8[](10);
        for (uint8 i = 0; i < 10; i++) {
            rows[i] = i;
            cols[i] = i;
        }
        vm.prank(address(randomNumbers));
        contests.fulfillRandomNumbers(contestId, rows, cols);

        // 4. Set up game scores (game completed)
        bytes memory quarterResponse = _createQuarterScoresResponse(
            100,  // qComplete: game finished
            true, // gameCompleted
            1,    // totalScoreChanges: 1
            4,    // homeQ1
            0,    // homeQ2
            0,    // homeQ3
            4,    // homeF
            1,    // awayQ1
            0,    // awayQ2
            0,    // awayQ3
            1,    // awayF
            4,    // homeQ1LastDigit
            4,    // homeQ2LastDigit
            4,    // homeQ3LastDigit
            4,    // homeFLastDigit
            1,    // awayQ1LastDigit
            1,    // awayQ2LastDigit
            1,    // awayQ3LastDigit
            1     // awayFLastDigit
        );

        bytes32 requestId1 = bytes32(uint256(1));
        gameScoreOracle.exposedFulfillQuarterScoresRequest(gameId, quarterResponse, requestId1);

        // 5. Set up score changes
        // Score change: home=4, away=1 → homeLastDigit=4, awayLastDigit=1
        // This should match box at row 4, col 1 (player1's box)
        uint8[] memory homeLastDigits = new uint8[](1);
        uint8[] memory awayLastDigits = new uint8[](1);
        homeLastDigits[0] = 4;
        awayLastDigits[0] = 1;

        bytes memory scoreChangesResponse = _createScoreChangesResponse(homeLastDigits, awayLastDigits);
        bytes32 requestId2 = bytes32(uint256(2));
        gameScoreOracle.exposedFulfillScoreChangesRequest(gameId, scoreChangesResponse, requestId2);

        // 6. Calculate payouts
        uint256 totalPot = BOX_COST;
        uint256 totalPotAfterFee = totalPot - (totalPot * 20 / 1000);

        IPayoutStrategy.PayoutInfo[] memory payouts = scoreChangesStrategy.calculatePayouts(
            contestId,
            gameId,
            totalPotAfterFee,
            gameScoreOracle,
            contests.getBoxOwner
        );

        // 7. Verify score change winner is player1
        // Should have 1 score change payout + 4 quarter payouts = 5 total
        assertGe(payouts.length, 1, "Should have at least 1 payout");

        // Find the score change payout (quarter = 0)
        bool foundScoreChange = false;
        for (uint256 i = 0; i < payouts.length; i++) {
            if (payouts[i].quarter == 0) {
                assertEq(payouts[i].winner, player1, "Score change winner should be player1 (box 41: row=4, col=1)");
                assertEq(payouts[i].reason, "Score Change #1", "Reason should be Score Change #1");
                foundScoreChange = true;
                break;
            }
        }
        assertTrue(foundScoreChange, "Should have found score change payout");
    }

    /**
     * @dev Test that getBoxOwner correctly maps rowScore/colScore to rows/cols
     * 
     * This test verifies the mapping:
     * - getBoxOwner(contestId, rowScore, colScore) where:
     *   - rowScore maps to contest.rows[row] (home team)
     *   - colScore maps to contest.cols[col] (away team)
     */
    function testGetBoxOwnerMapping() public {
        uint256 gameId = 401772980;
        uint256 contestId = 0;

        // Create contest
        contests.createContest(
            gameId,
            BOX_COST,
            address(0),
            "Test Contest",
            "Test Description",
            address(quartersOnlyStrategy)
        );

        // Claim box 41 (row 4, col 1)
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = 41;
        vm.prank(player1);
        contests.claimBoxes{value: BOX_COST}(tokenIds, player1);

        // Set random values
        // rows[4] = 4 (home team score 4)
        // cols[1] = 1 (away team score 1)
        uint8[] memory rows = new uint8[](10);
        uint8[] memory cols = new uint8[](10);
        for (uint8 i = 0; i < 10; i++) {
            rows[i] = i;
            cols[i] = i;
        }
        vm.prank(address(randomNumbers));
        contests.fulfillRandomNumbers(contestId, rows, cols);

        // Verify getBoxOwner mapping:
        // getBoxOwner(contestId, 4, 1) should return player1
        // Because: rows[4] = 4 and cols[1] = 1 → box at row 4, col 1 = tokenId 41 = player1
        address owner = contests.getBoxOwner(contestId, 4, 1);
        assertEq(owner, player1, "getBoxOwner(4,1) should return player1 (row=4 maps to rows[4]=4, col=1 maps to cols[1]=1)");

        // Verify reverse mapping doesn't work (this would catch the bug)
        // getBoxOwner(contestId, 1, 4) should NOT return player1
        // Because: rows[1] = 1 and cols[4] = 4 → box at row 1, col 4 = tokenId 14 ≠ player1
        address wrongOwner = contests.getBoxOwner(contestId, 1, 4);
        assertNotEq(wrongOwner, player1, "getBoxOwner(1,4) should NOT return player1 (reversed parameters)");
    }

    /**
     * @dev Test multiple quarter winners with different box owners
     */
    function testMultipleQuarterWinners() public {
        uint256 gameId = 401772980;
        uint256 contestId = 0;

        // Create contest
        contests.createContest(
            gameId,
            BOX_COST,
            address(0),
            "Test Contest",
            "Test Description",
            address(quartersOnlyStrategy)
        );

        // Claim multiple boxes
        // Box 41 = row 4, col 1 (player1) - will win Q1
        // Box 67 = row 6, col 7 (player2) - will win Q2
        uint256[] memory tokenIds1 = new uint256[](1);
        tokenIds1[0] = 41;
        vm.prank(player1);
        contests.claimBoxes{value: BOX_COST}(tokenIds1, player1);

        uint256[] memory tokenIds2 = new uint256[](1);
        tokenIds2[0] = 67;
        vm.prank(player2);
        contests.claimBoxes{value: BOX_COST}(tokenIds2, player2);

        // Set random values
        uint8[] memory rows = new uint8[](10);
        uint8[] memory cols = new uint8[](10);
        for (uint8 i = 0; i < 10; i++) {
            rows[i] = i;
            cols[i] = i;
        }
        vm.prank(address(randomNumbers));
        contests.fulfillRandomNumbers(contestId, rows, cols);

        // Set up game scores: Q1: home=4, away=1 | Q2: home=6, away=7 (cumulative)
        // For Q2 to match row=6, col=7, we need cumulative scores ending in 6 and 7
        // Q1: home=4, away=1 → Q1 last digits: 4, 1
        // Q2: home=6, away=7 → Q2 last digits: 6, 7 (cumulative)
        bytes memory quarterResponse = _createQuarterScoresResponse(
            2,    // qComplete: Q2 done
            false,
            0,
            4,    // homeQ1
            6,    // homeQ2 (cumulative, so Q2 adds 2 points)
            0,    // homeQ3
            0,    // homeF
            1,    // awayQ1
            7,    // awayQ2 (cumulative, so Q2 adds 6 points)
            0,    // awayQ3
            0,    // awayF
            4,    // homeQ1LastDigit
            6,    // homeQ2LastDigit (cumulative: ends in 6)
            0,    // homeQ3LastDigit
            0,    // homeFLastDigit
            1,    // awayQ1LastDigit
            7,    // awayQ2LastDigit (cumulative: ends in 7)
            0,    // awayQ3LastDigit
            0     // awayFLastDigit
        );

        bytes32 requestId = bytes32(uint256(1));
        gameScoreOracle.exposedFulfillQuarterScoresRequest(gameId, quarterResponse, requestId);

        // Calculate payouts
        uint256 totalPot = 2 * BOX_COST;
        uint256 totalPotAfterFee = totalPot - (totalPot * 20 / 1000);

        IPayoutStrategy.PayoutInfo[] memory payouts = quartersOnlyStrategy.calculatePayouts(
            contestId,
            gameId,
            totalPotAfterFee,
            gameScoreOracle,
            contests.getBoxOwner
        );

        // Verify Q1 winner is player1 (home=4, away=1 → row=4, col=1)
        // Verify Q2 winner is player2 (home=6, away=7 → row=6, col=7)
        assertEq(payouts.length, 2, "Should have 2 payouts for Q1 and Q2");

        // Find Q1 and Q2 payouts
        address q1Winner = address(0);
        address q2Winner = address(0);
        for (uint256 i = 0; i < payouts.length; i++) {
            if (payouts[i].quarter == 1) {
                q1Winner = payouts[i].winner;
            } else if (payouts[i].quarter == 2) {
                q2Winner = payouts[i].winner;
            }
        }

        assertEq(q1Winner, player1, "Q1 winner should be player1 (box 41: row=4, col=1)");
        assertEq(q2Winner, player2, "Q2 winner should be player2 (box 67: row=6, col=7)");
    }

    /**
     * @dev Test that verifies the bug would have been caught
     * This test would fail with the old buggy code (reversed parameters)
     */
    function testPayoutStrategyParameterOrder() public {
        uint256 gameId = 401772980;
        uint256 contestId = 0;

        // Create contest
        contests.createContest(
            gameId,
            BOX_COST,
            address(0),
            "Test Contest",
            "Test Description",
            address(quartersOnlyStrategy)
        );

        // Claim box 41 (row 4, col 1) - player1
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = 41;
        vm.prank(player1);
        contests.claimBoxes{value: BOX_COST}(tokenIds, player1);

        // Set random values: rows[4]=4, cols[1]=1
        uint8[] memory rows = new uint8[](10);
        uint8[] memory cols = new uint8[](10);
        for (uint8 i = 0; i < 10; i++) {
            rows[i] = i;
            cols[i] = i;
        }
        vm.prank(address(randomNumbers));
        contests.fulfillRandomNumbers(contestId, rows, cols);

        // Game Q1: home=4, away=1
        // Correct call: getBoxOwner(contestId, 4, 1) → should return player1
        // Buggy call: getBoxOwner(contestId, 1, 4) → would return wrong owner
        bytes memory quarterResponse = _createQuarterScoresResponse(
            1,
            false,
            0,
            4, 0, 0, 0, // home scores
            1, 0, 0, 0, // away scores
            4, 0, 0, 0, // home last digits
            1, 0, 0, 0  // away last digits
        );

        bytes32 requestId = bytes32(uint256(1));
        gameScoreOracle.exposedFulfillQuarterScoresRequest(gameId, quarterResponse, requestId);

        // Calculate payouts - this should use getBoxOwner(contestId, 4, 1)
        uint256 totalPot = BOX_COST;
        uint256 totalPotAfterFee = totalPot - (totalPot * 20 / 1000);

        IPayoutStrategy.PayoutInfo[] memory payouts = quartersOnlyStrategy.calculatePayouts(
            contestId,
            gameId,
            totalPotAfterFee,
            gameScoreOracle,
            contests.getBoxOwner
        );

        // This assertion would fail with the buggy code
        assertEq(payouts[0].winner, player1, "Winner must be player1 - this test catches the reversed parameter bug");
    }
}
