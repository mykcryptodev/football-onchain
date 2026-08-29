// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {CREScoreOracle} from "../src/CREScoreOracle.sol";

contract CREScoreOracleTest is Test {
    CREScoreOracle public oracle;
    address public owner = address(this);
    address public forwarder = address(0xF0FD);
    address public stranger = address(0xBAD);

    uint256 constant GAME_ID = 401873277;
    uint256 constant YEAR = 2026;
    uint8 constant SEASON_TYPE = 1;
    uint8 constant WEEK = 2;

    function setUp() public {
        vm.warp(1_700_000_000); // realistic timestamp so cooldown checks start satisfied
        oracle = new CREScoreOracle(forwarder);
    }

    // ---------- helpers ----------

    function _packDigits(
        uint8 hQ1, uint8 hQ2, uint8 hQ3, uint8 hF,
        uint8 aQ1, uint8 aQ2, uint8 aQ3, uint8 aF
    ) internal pure returns (uint256) {
        return (uint256(hQ1) << 252) | (uint256(hQ2) << 248) | (uint256(hQ3) << 244) | (uint256(hF) << 240)
            | (uint256(aQ1) << 236) | (uint256(aQ2) << 232) | (uint256(aQ3) << 228) | (uint256(aF) << 224);
    }

    function _packScores(
        uint8 hQ1, uint8 hQ2, uint8 hQ3, uint8 hF,
        uint8 aQ1, uint8 aQ2, uint8 aQ3, uint8 aF
    ) internal pure returns (uint256) {
        return (uint256(hQ1) << 248) | (uint256(hQ2) << 240) | (uint256(hQ3) << 232) | (uint256(hF) << 224)
            | (uint256(aQ1) << 216) | (uint256(aQ2) << 208) | (uint256(aQ3) << 200) | (uint256(aF) << 192);
    }

    function _gameScoresReport(
        uint256 gameId, uint8 qComplete, bool completed, uint8 totalScoreChanges,
        uint256 packedScores, uint256 packedDigits
    ) internal pure returns (bytes memory) {
        return abi.encode(uint8(0), gameId, qComplete, completed, totalScoreChanges, packedScores, packedDigits);
    }

    function _writeFinalGame() internal {
        // MIA 7 @ WSH 20 final (WSH home): homeQ 0,17,0,F20 ; awayQ 7,0,0,F7
        // cumulative digits home: 0, 0+17=17->7, 17+0=17->7, 20->0 | away: 7, 7, 7, 7
        uint256 digits = _packDigits(0, 7, 7, 0, 7, 7, 7, 7);
        uint256 scores = _packScores(0, 17, 0, 20, 7, 0, 0, 7);
        bytes memory report = _gameScoresReport(GAME_ID, 100, true, 5, scores, digits);
        vm.prank(forwarder);
        oracle.onReport("", report);
    }

    // ---------- access control ----------

    function test_onReport_revertsForStranger() public {
        bytes memory report = _gameScoresReport(GAME_ID, 100, true, 0, 0, 0);
        vm.prank(stranger);
        vm.expectRevert(CREScoreOracle.UnauthorizedCaller.selector);
        oracle.onReport("", report);
    }

    function test_onReport_ownerCanWrite() public {
        bytes memory report = _gameScoresReport(GAME_ID, 50, false, 0, 0, _packDigits(3, 7, 0, 0, 7, 3, 0, 0));
        oracle.onReport("", report); // owner == address(this)
        (,,,,,,,, uint8 qComplete,) = oracle.getGameScores(GAME_ID);
        assertEq(qComplete, 50);
    }

    function test_setForwarder_onlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert("Only callable by owner");
        oracle.setForwarder(stranger);

        oracle.setForwarder(stranger);
        assertEq(oracle.forwarder(), stranger);
    }

    // ---------- reporter role ----------

    function test_setReporter_onlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert("Only callable by owner");
        oracle.setReporter(stranger);

        oracle.setReporter(stranger);
        assertEq(oracle.reporter(), stranger);
    }

    function test_onReport_reporterCanWrite() public {
        address reporter = address(0xFE11);
        oracle.setReporter(reporter);

        bytes memory report = _gameScoresReport(GAME_ID, 75, false, 0, 0, _packDigits(1, 4, 0, 0, 2, 5, 0, 0));
        vm.prank(reporter);
        oracle.onReport("", report);

        (,,,,,,,, uint8 qComplete,) = oracle.getGameScores(GAME_ID);
        assertEq(qComplete, 75);
    }

    function test_onReport_revertsAfterReporterRevoked() public {
        address reporter = address(0xFE11);
        oracle.setReporter(reporter);
        oracle.setReporter(address(0));

        bytes memory report = _gameScoresReport(GAME_ID, 100, true, 0, 0, 0);
        vm.prank(reporter);
        vm.expectRevert(CREScoreOracle.UnauthorizedCaller.selector);
        oracle.onReport("", report);
    }

    function test_onReport_forwarderStillWorksWithReporterSet() public {
        oracle.setReporter(address(0xFE11));

        bytes memory report = _gameScoresReport(GAME_ID, 100, true, 0, 0, 0);
        vm.prank(forwarder);
        oracle.onReport("", report);

        (,,,,,,,, uint8 qComplete,) = oracle.getGameScores(GAME_ID);
        assertEq(qComplete, 100);
    }

    // ---------- game scores ----------

    function test_gameScores_writeAndUnpack() public {
        _writeFinalGame();

        (uint8 hQ1d, uint8 hQ2d, uint8 hQ3d, uint8 hFd, uint8 aQ1d, uint8 aQ2d, uint8 aQ3d, uint8 aFd, uint8 qComplete, bool inProgress) =
            oracle.getGameScores(GAME_ID);

        assertEq(hQ1d, 0); assertEq(hQ2d, 7); assertEq(hQ3d, 7); assertEq(hFd, 0);
        assertEq(aQ1d, 7); assertEq(aQ2d, 7); assertEq(aQ3d, 7); assertEq(aFd, 7);
        assertEq(qComplete, 100);
        assertFalse(inProgress); // never stuck

        (uint8 hQ1, uint8 hQ2,, uint8 hF,,,, uint8 aF) = oracle.getQuarterScores(GAME_ID);
        assertEq(hQ1, 0);
        assertEq(hQ2, 17);
        assertEq(hF, 20);
        assertEq(aF, 7);

        assertTrue(oracle.isGameCompleted(GAME_ID));
        assertEq(oracle.getTotalScoreChanges(GAME_ID), 5);
    }

    function test_fetchGameScores_cooldownAndEvent() public {
        vm.expectEmit(true, false, false, true);
        emit CREScoreOracle.GameScoresRequested(GAME_ID, bytes32(uint256(1)));
        oracle.fetchGameScores(6, 300000, bytes32("fun-base-mainnet-1"), GAME_ID);

        vm.expectRevert(CREScoreOracle.CooldownNotMet.selector);
        oracle.fetchGameScores(6, 300000, bytes32(0), GAME_ID);

        vm.warp(block.timestamp + 10 minutes + 1);
        oracle.fetchGameScores(6, 300000, bytes32(0), GAME_ID); // no revert after cooldown
    }

    // ---------- score changes ----------

    function _scoreChangesReport(uint256 gameId, uint8 count, uint256[] memory packed) internal pure returns (bytes memory) {
        return abi.encode(uint8(1), gameId, count, packed);
    }

    function test_scoreChanges_writeAndDecode() public {
        _writeFinalGame();

        // 2 score changes: (home 7, away 0) then (home 7, away 7)
        uint256 change0 = (uint256(7) << 4) | 0; // homeLastDigit=7 awayLastDigit=0
        uint256 change1 = (uint256(7) << 4) | 7;
        uint256[] memory packed = new uint256[](1);
        packed[0] = change0 | (change1 << 32);

        vm.prank(forwarder);
        oracle.onReport("", _scoreChangesReport(GAME_ID, 2, packed));

        assertTrue(oracle.areScoreChangesAvailable(GAME_ID));
        assertEq(oracle.getTotalScoreChanges(GAME_ID), 2);

        CREScoreOracle.ScoreChangeEvent[] memory changes = oracle.getScoreChanges(GAME_ID);
        assertEq(changes.length, 2);
        assertEq(changes[0].homeLastDigit, 7);
        assertEq(changes[0].awayLastDigit, 0);
        assertEq(changes[1].homeLastDigit, 7);
        assertEq(changes[1].awayLastDigit, 7);

        CREScoreOracle.ScoreChangeEvent memory single = oracle.getScoreChange(GAME_ID, 1);
        assertEq(single.awayLastDigit, 7);

        vm.expectRevert(CREScoreOracle.ScoreChangeIndexOutOfBounds.selector);
        oracle.getScoreChange(GAME_ID, 2);
    }

    function test_fetchScoreChanges_gating() public {
        // game not completed yet
        vm.expectRevert(CREScoreOracle.GameNotCompleted.selector);
        oracle.fetchScoreChanges(6, 300000, bytes32(0), GAME_ID);

        _writeFinalGame();
        oracle.fetchScoreChanges(6, 300000, bytes32(0), GAME_ID); // ok

        // now store changes and confirm AlreadyStored
        uint256[] memory packed = new uint256[](1);
        packed[0] = (uint256(7) << 4);
        vm.prank(forwarder);
        oracle.onReport("", _scoreChangesReport(GAME_ID, 1, packed));

        vm.warp(block.timestamp + 6 minutes);
        vm.expectRevert(CREScoreOracle.ScoreChangesAlreadyStored.selector);
        oracle.fetchScoreChanges(6, 300000, bytes32(0), GAME_ID);
    }

    // ---------- week games ----------

    function _weekGamesReport(uint256 weekId, uint8 count, uint256[] memory packedIds) internal pure returns (bytes memory) {
        return abi.encode(uint8(2), weekId, count, packedIds);
    }

    function test_weekGames_writeAndUnpack() public {
        uint256 weekId = oracle.calculateWeekId(YEAR, SEASON_TYPE, WEEK);
        // 4 game ids, 3 per uint256 (85 bits each)
        uint256 g0 = 401873277; uint256 g1 = 401873278; uint256 g2 = 401873279; uint256 g3 = 401873280;
        uint256[] memory packed = new uint256[](2);
        packed[0] = (g0 << 170) | (g1 << 85) | g2;
        packed[1] = g3 << 170;

        vm.prank(forwarder);
        oracle.onReport("", _weekGamesReport(weekId, 4, packed));

        (uint256[] memory ids, uint256 deadline) = oracle.getWeekGames(YEAR, SEASON_TYPE, WEEK);
        assertEq(ids.length, 4);
        assertEq(ids[0], g0); assertEq(ids[1], g1); assertEq(ids[2], g2); assertEq(ids[3], g3);
        assertEq(deadline, block.timestamp + 7 days);

        vm.expectRevert(CREScoreOracle.WeekGamesAlreadyFinalized.selector);
        oracle.fetchWeekGames(6, 300000, bytes32(0), YEAR, SEASON_TYPE, WEEK);
    }

    function test_weekGames_unfinalizedReturnsEmpty() public {
        (uint256[] memory ids, uint256 deadline) = oracle.getWeekGames(YEAR, SEASON_TYPE, WEEK);
        assertEq(ids.length, 0);
        assertEq(deadline, 0);
    }

    // ---------- week results ----------

    function test_weekResults_writeAndUnpack() public {
        uint256 weekId = oracle.calculateWeekId(YEAR, SEASON_TYPE, WEEK);

        // seed week games first (4 games) so getWeekResults sizes correctly
        uint256[] memory packedIds = new uint256[](2);
        packedIds[0] = (uint256(401873277) << 170) | (uint256(401873278) << 85) | uint256(401873279);
        packedIds[1] = uint256(401873280) << 170;
        vm.prank(forwarder);
        oracle.onReport("", _weekGamesReport(weekId, 4, packedIds));

        // not all completed -> early return, nothing stored
        bytes memory partialReport = abi.encode(uint8(3), weekId, uint256(0), uint8(2), uint256(1), uint256(0), uint256(0));
        vm.prank(forwarder);
        oracle.onReport("", partialReport);
        (,,, bool isFinalized,,) = oracle.weekResults(weekId);
        assertFalse(isFinalized);

        // all completed: games 0 and 3 home wins -> bits 0 and 3
        uint256 packedResults = (1 << 0) | (1 << 3);
        bytes memory full = abi.encode(uint8(3), weekId, uint256(1), uint8(4), packedResults, uint256(47), uint256(401873280));
        vm.prank(forwarder);
        oracle.onReport("", full);

        uint8[] memory winners = oracle.getWeekResults(YEAR, SEASON_TYPE, WEEK);
        assertEq(winners.length, 4);
        assertEq(winners[0], 1);
        assertEq(winners[1], 0);
        assertEq(winners[2], 0);
        assertEq(winners[3], 1);

        (,,, bool finalizedAfter, uint256 tiebreakerTotalPoints, uint256 tiebreakerGameId) = oracle.weekResults(weekId);
        assertTrue(finalizedAfter);
        assertEq(tiebreakerTotalPoints, 47);
        assertEq(tiebreakerGameId, 401873280);

        vm.expectRevert(CREScoreOracle.WeekResultsAlreadyFinalized.selector);
        oracle.fetchWeekResults(6, 300000, bytes32(0), YEAR, SEASON_TYPE, WEEK);
    }

    function test_onReport_unknownTypeReverts() public {
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(CREScoreOracle.UnknownReportType.selector, uint8(99)));
        oracle.onReport("", abi.encode(uint8(99)));
    }
}
