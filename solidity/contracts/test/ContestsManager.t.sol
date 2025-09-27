// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ContestsManager} from "../src/ContestsManager.sol";
import {Contests} from "../src/Contests.sol";
import {MockERC20} from "./MockERC20.sol";
import {IContestTypes} from "../src/IContestTypes.sol";
import {Boxes} from "../src/Boxes.sol";
import {GameScoreOracle} from "../src/GameScoreOracle.sol";
import {QuartersOnlyPayoutStrategy} from "../src/QuartersOnlyPayoutStrategy.sol";
import {ScoreChangesPayoutStrategy} from "../src/ScoreChangesPayoutStrategy.sol";
import "./DummyVRF.sol";
import "forge-std/console.sol";
import "./DummyRandomNumbers.sol";

contract ContestsManagerTest is Test {
    ContestsManager public reader;
    Contests public contests;
    MockERC20 public mockToken;
    Boxes public boxes;
    GameScoreOracle public gameScoreOracle;
    QuartersOnlyPayoutStrategy public quartersOnlyStrategy;
    ScoreChangesPayoutStrategy public scoreChangesStrategy;
    DummyVRF public dummyVRF;
    DummyRandomNumbers public randomNumbers;
    address public constant TREASURY = address(0x1);
    address public constant VRF_WRAPPER = address(0x4);

    function setUp() public {
        // Deploy dummy VRF
        dummyVRF = new DummyVRF();

        // Deploy mock ERC20 token with 18 decimals
        mockToken = new MockERC20("Mock Token", "MTK", 18);

        // Deploy ContestsReader first
        reader = new ContestsManager();

        // Deploy Boxes contract
        boxes = new Boxes();

        gameScoreOracle = new GameScoreOracle(
            address(dummyVRF) // not really the router, but it's fine for testing
        );

        randomNumbers = new DummyRandomNumbers(address(dummyVRF));

        // Deploy Payout Strategy contracts
        quartersOnlyStrategy = new QuartersOnlyPayoutStrategy();
        scoreChangesStrategy = new ScoreChangesPayoutStrategy();

        // Deploy Contests contract
        contests = new Contests(
            TREASURY,
            boxes,
            gameScoreOracle,
            reader,
            randomNumbers
        );

        // set boxes
        boxes.setContests(contests);

        // Set ContestStorage in ContestsReader
        reader.setContestStorage(address(contests));
    }

    function testGetContestCurrencyForEth() public {
        // Create contest with ETH as currency
        uint256 gameId = 1;
        uint256 boxCost = 0.1 ether;
        contests.createContest(gameId, boxCost, address(0), "Test Contest", "Test Description", address(quartersOnlyStrategy));

        // Get currency details for contest 0
        (address currency, uint256 decimals, string memory symbol, string memory name, uint256 amount) = reader.getContestCurrency(0);

        assertEq(currency, address(0), "Currency should be zero address for ETH");
        assertEq(decimals, 18, "Decimals should be 18 for ETH");
        assertEq(amount, boxCost, "Amount should match contest creation amount");
        assertEq(symbol, "ETH", "Symbol should be ETH");
        assertEq(name, "Ether", "Name should be Ether");
    }

    function testGetContestCurrencyForERC20() public {
        // Create contest with ERC20 token as currency
        uint256 gameId = 1;
        uint256 boxCost = 100 * 10**18; // 100 tokens
        contests.createContest(gameId, boxCost, address(mockToken), "ERC20 Test Contest", "Test with ERC20 token", address(quartersOnlyStrategy));

        // Get currency details for contest 0
        (address currency, uint256 decimals, string memory symbol, string memory name, uint256 amount) = reader.getContestCurrency(0);

        assertEq(currency, address(mockToken), "Currency should be mock token address");
        assertEq(decimals, 18, "Decimals should match mock token decimals");
        assertEq(amount, boxCost, "Amount should match contest creation amount");
        assertEq(symbol, "MTK", "Symbol should match mock token symbol");
        assertEq(name, "Mock Token", "Name should match mock token name");
    }
}
