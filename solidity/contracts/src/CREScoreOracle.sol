// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title CREScoreOracle
 * @notice Drop-in replacement for GameScoreOracle, written by Chainlink CRE workflows
 *         via the KeystoneForwarder (replaces the sunset Chainlink Functions DON).
 *
 * Interface parity with GameScoreOracle:
 * - identical structs, storage layout names, getter signatures, and events
 * - fetch* request functions keep their old signatures (subscriptionId/gasLimit/jobId
 *   are ignored) so consumers and the frontend only need an address change
 * - getGameScores always returns requestInProgress=false (no async request lifecycle)
 *
 * Write path: CRE workflow -> signed report -> KeystoneForwarder -> onReport().
 * A designated `reporter` address (e.g. the app's self-hosted oracle writer) may
 * also call onReport, and the owner retains a manual escape hatch.
 */
contract CREScoreOracle is ConfirmedOwner {
    struct GameScore {
        uint256 id;
        uint8 qComplete;
        bool requestInProgress; // always false; kept for interface parity
        bool gameCompleted;
        uint256 packedQuarterScores;
        uint256 packedQuarterDigits;
        uint8 totalScoreChanges;
    }

    struct ScoreChangeEvent {
        uint8 homeLastDigit;
        uint8 awayLastDigit;
    }

    struct WeekGames {
        uint8 seasonType;
        uint8 weekNumber;
        uint256 year;
        uint256[] packedGameIds;
        uint8 gamesCount;
        bool isFinalized;
    }

    struct WeekResults {
        uint256 weekId;
        uint256 packedResults;
        uint8 gamesCount;
        bool isFinalized;
        uint256 tiebreakerTotalPoints;
        uint256 tiebreakerGameId;
    }

    uint256 public constant QUARTER_SCORES_REQUEST_COOLDOWN = 10 minutes;
    uint256 public constant SCORE_CHANGES_REQUEST_COOLDOWN = 5 minutes;

    // Report types (first field of every CRE report payload)
    uint8 internal constant REPORT_GAME_SCORES = 0;
    uint8 internal constant REPORT_SCORE_CHANGES = 1;
    uint8 internal constant REPORT_WEEK_GAMES = 2;
    uint8 internal constant REPORT_WEEK_RESULTS = 3;

    // CRE KeystoneForwarder address authorized to deliver reports
    address public forwarder;

    // Additional address authorized to deliver reports (self-hosted oracle writer).
    // Optional: address(0) disables it. CRE remains usable via the forwarder gate.
    address public reporter;

    mapping(uint256 gameId => GameScore gameScore) public gameScores;
    mapping(uint256 gameId => uint256[] packedScoreChanges) public gameScoreChanges;
    mapping(uint256 weekId => WeekGames) public weekGames;
    mapping(uint256 weekId => WeekResults) public weekResults;
    mapping(uint256 gameId => uint256 lastRequestTimestamp) public quarterScoresLastRequestTime;
    mapping(uint256 gameId => uint256 lastRequestTimestamp) public scoreChangesLastRequestTime;

    uint256 public requestNonce;

    event GameScoresRequested(uint256 indexed gameId, bytes32 requestId);
    event GameScoresUpdated(uint256 indexed gameId, bytes32 requestId);
    event ScoreChangesRequested(uint256 indexed gameId, bytes32 requestId);
    event ScoreChangesUpdated(uint256 indexed gameId, bytes32 requestId);
    event WeekGamesRequested(uint256 indexed weekId, bytes32 requestId);
    event WeekGamesUpdated(uint256 indexed weekId, uint8 gameCount);
    event WeekResultsRequested(uint256 indexed weekId, bytes32 requestId);
    event WeekResultsUpdated(uint256 indexed weekId, uint8 gameCount, bool allGamesCompleted);
    event ForwarderUpdated(address indexed forwarder);
    event ReporterUpdated(address indexed reporter);

    error ScoreChangeIndexOutOfBounds();
    error CooldownNotMet();
    error GameNotCompleted();
    error ScoreChangesAlreadyStored();
    error WeekResultsAlreadyFinalized();
    error WeekGamesAlreadyFinalized();
    error UnauthorizedCaller();
    error UnknownReportType(uint8 reportType);

    constructor(address forwarder_) ConfirmedOwner(msg.sender) {
        forwarder = forwarder_;
    }

    function setForwarder(address forwarder_) external onlyOwner {
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function setReporter(address reporter_) external onlyOwner {
        reporter = reporter_;
        emit ReporterUpdated(reporter_);
    }

    ////////////////////////////////////
    ///////////  WRITE PATH  ///////////
    ////////////////////////////////////

    /**
     * @notice CRE report entry point. Called by the KeystoneForwarder, the designated
     *         reporter, or the owner as manual override.
     * @param report ABI-encoded payload; first field is the uint8 report type
     */
    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != forwarder && msg.sender != reporter && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }

        uint8 reportType = abi.decode(report, (uint8));

        if (reportType == REPORT_GAME_SCORES) {
            (
                ,
                uint256 gameId,
                uint8 qComplete,
                bool gameCompleted,
                uint8 totalScoreChanges,
                uint256 packedQuarterScores_,
                uint256 packedQuarterDigits_
            ) = abi.decode(report, (uint8, uint256, uint8, bool, uint8, uint256, uint256));

            gameScores[gameId] = GameScore({
                id: gameId,
                qComplete: qComplete,
                requestInProgress: false,
                gameCompleted: gameCompleted,
                packedQuarterScores: packedQuarterScores_,
                packedQuarterDigits: packedQuarterDigits_,
                totalScoreChanges: totalScoreChanges
            });

            emit GameScoresUpdated(gameId, bytes32(0));
        } else if (reportType == REPORT_SCORE_CHANGES) {
            (, uint256 gameId, uint8 totalScoreChanges, uint256[] memory packedScoreChanges_) =
                abi.decode(report, (uint8, uint256, uint8, uint256[]));

            gameScoreChanges[gameId] = packedScoreChanges_;
            gameScores[gameId].totalScoreChanges = totalScoreChanges;

            emit ScoreChangesUpdated(gameId, bytes32(0));
        } else if (reportType == REPORT_WEEK_GAMES) {
            (, uint256 weekId, uint8 gameCount, uint256[] memory packedGameIds_) =
                abi.decode(report, (uint8, uint256, uint8, uint256[]));

            WeekGames storage wg = weekGames[weekId];
            wg.year = weekId >> 16;
            wg.seasonType = uint8((weekId >> 8) & 0xFF);
            wg.weekNumber = uint8(weekId & 0xFF);
            wg.gamesCount = gameCount;
            wg.isFinalized = true;
            delete wg.packedGameIds;
            for (uint256 i = 0; i < packedGameIds_.length; i++) {
                if (packedGameIds_[i] > 0) {
                    wg.packedGameIds.push(packedGameIds_[i]);
                }
            }

            emit WeekGamesUpdated(weekId, gameCount);
        } else if (reportType == REPORT_WEEK_RESULTS) {
            (
                ,
                uint256 weekId,
                uint256 allCompleted,
                uint8 gameCount,
                uint256 packedResults,
                uint256 tiebreakerTotalPoints,
                uint256 tiebreakerGameId
            ) = abi.decode(report, (uint8, uint256, uint256, uint8, uint256, uint256, uint256));

            if (allCompleted == 0) {
                emit WeekResultsUpdated(weekId, 0, false);
                return;
            }

            WeekResults storage wr = weekResults[weekId];
            wr.weekId = weekId;
            wr.gamesCount = gameCount;
            wr.packedResults = packedResults;
            wr.tiebreakerTotalPoints = tiebreakerTotalPoints;
            wr.tiebreakerGameId = tiebreakerGameId;
            wr.isFinalized = true;

            emit WeekResultsUpdated(weekId, gameCount, true);
        } else {
            revert UnknownReportType(reportType);
        }
    }

    ////////////////////////////////////
    /////////  REQUEST PATH  ///////////
    ////////////////////////////////////

    function fetchGameScores(
        uint64, // subscriptionId (ignored, kept for interface parity)
        uint32, // gasLimit (ignored)
        bytes32, // jobId (ignored)
        uint256 gameId
    ) external returns (bytes32 requestId) {
        if (block.timestamp - quarterScoresLastRequestTime[gameId] <= QUARTER_SCORES_REQUEST_COOLDOWN) {
            revert CooldownNotMet();
        }
        quarterScoresLastRequestTime[gameId] = block.timestamp;

        requestId = bytes32(++requestNonce);
        emit GameScoresRequested(gameId, requestId);
    }

    function fetchScoreChanges(
        uint64, // subscriptionId (ignored)
        uint32, // gasLimit (ignored)
        bytes32, // jobId (ignored)
        uint256 gameId
    ) external returns (bytes32 requestId) {
        if (!gameScores[gameId].gameCompleted) {
            revert GameNotCompleted();
        }
        if (gameScoreChanges[gameId].length > 0) {
            revert ScoreChangesAlreadyStored();
        }
        if (block.timestamp - scoreChangesLastRequestTime[gameId] <= SCORE_CHANGES_REQUEST_COOLDOWN) {
            revert CooldownNotMet();
        }
        scoreChangesLastRequestTime[gameId] = block.timestamp;

        requestId = bytes32(++requestNonce);
        emit ScoreChangesRequested(gameId, requestId);
    }

    function fetchWeekGames(
        uint64, // subscriptionId (ignored)
        uint32, // gasLimit (ignored)
        bytes32, // jobId (ignored)
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external returns (bytes32 requestId) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        if (weekGames[weekId].isFinalized) {
            revert WeekGamesAlreadyFinalized();
        }

        requestId = bytes32(++requestNonce);
        emit WeekGamesRequested(weekId, requestId);
    }

    function fetchWeekResults(
        uint64, // subscriptionId (ignored)
        uint32, // gasLimit (ignored)
        bytes32, // jobId (ignored)
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external returns (bytes32 requestId) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        if (weekResults[weekId].isFinalized) {
            revert WeekResultsAlreadyFinalized();
        }

        requestId = bytes32(++requestNonce);
        emit WeekResultsRequested(weekId, requestId);
    }

    ////////////////////////////////////
    ///////////  GETTERS  //////////////
    ////////////////////////////////////

    function getGameScores(uint256 gameId) external view returns (
        uint8 homeQ1LastDigit,
        uint8 homeQ2LastDigit,
        uint8 homeQ3LastDigit,
        uint8 homeFLastDigit,
        uint8 awayQ1LastDigit,
        uint8 awayQ2LastDigit,
        uint8 awayQ3LastDigit,
        uint8 awayFLastDigit,
        uint8 qComplete,
        bool requestInProgress
    ) {
        GameScore memory gameScore = gameScores[gameId];
        uint256 packedQuarterDigits = gameScore.packedQuarterDigits;

        homeQ1LastDigit = uint8((packedQuarterDigits >> 252) & 0xF);
        homeQ2LastDigit = uint8((packedQuarterDigits >> 248) & 0xF);
        homeQ3LastDigit = uint8((packedQuarterDigits >> 244) & 0xF);
        homeFLastDigit = uint8((packedQuarterDigits >> 240) & 0xF);
        awayQ1LastDigit = uint8((packedQuarterDigits >> 236) & 0xF);
        awayQ2LastDigit = uint8((packedQuarterDigits >> 232) & 0xF);
        awayQ3LastDigit = uint8((packedQuarterDigits >> 228) & 0xF);
        awayFLastDigit = uint8((packedQuarterDigits >> 224) & 0xF);

        return (
            homeQ1LastDigit,
            homeQ2LastDigit,
            homeQ3LastDigit,
            homeFLastDigit,
            awayQ1LastDigit,
            awayQ2LastDigit,
            awayQ3LastDigit,
            awayFLastDigit,
            gameScore.qComplete,
            gameScore.requestInProgress
        );
    }

    function isGameCompleted(uint256 gameId) external view returns (bool) {
        return gameScores[gameId].gameCompleted;
    }

    function getTotalScoreChanges(uint256 gameId) external view returns (uint8) {
        return gameScores[gameId].totalScoreChanges;
    }

    function getScoreChanges(uint256 gameId) external view returns (ScoreChangeEvent[] memory) {
        uint256[] memory packedScoreChanges = gameScoreChanges[gameId];
        uint8 totalScoreChanges = gameScores[gameId].totalScoreChanges;

        ScoreChangeEvent[] memory scoreChanges = new ScoreChangeEvent[](totalScoreChanges);

        for (uint8 i = 0; i < totalScoreChanges; i++) {
            uint8 uint256Index = i / 8;
            uint8 offsetInUint256 = i % 8;

            uint256 packedUint256 = packedScoreChanges[uint256Index];
            uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

            uint8 homeLastDigit = uint8((packedChange >> 4) & 0xF);
            uint8 awayLastDigit = uint8(packedChange & 0xF);

            scoreChanges[i] = ScoreChangeEvent({
                homeLastDigit: homeLastDigit,
                awayLastDigit: awayLastDigit
            });
        }

        return scoreChanges;
    }

    function getScoreChange(uint256 gameId, uint256 index) external view returns (ScoreChangeEvent memory) {
        uint256[] memory packedScoreChanges = gameScoreChanges[gameId];
        uint8 totalScoreChanges = gameScores[gameId].totalScoreChanges;

        if (index >= totalScoreChanges) revert ScoreChangeIndexOutOfBounds();

        uint8 uint256Index = uint8(index / 8);
        uint8 offsetInUint256 = uint8(index % 8);

        uint256 packedUint256 = packedScoreChanges[uint256Index];
        uint256 packedChange = (packedUint256 >> (offsetInUint256 * 32)) & 0xFFFFFFFF;

        uint8 homeLastDigit = uint8((packedChange >> 4) & 0xF);
        uint8 awayLastDigit = uint8(packedChange & 0xF);

        return ScoreChangeEvent({
            homeLastDigit: homeLastDigit,
            awayLastDigit: awayLastDigit
        });
    }

    function areScoreChangesAvailable(uint256 gameId) external view returns (bool) {
        return gameScoreChanges[gameId].length > 0;
    }

    function getQuarterScores(uint256 gameId) external view returns (
        uint8 homeQ1,
        uint8 homeQ2,
        uint8 homeQ3,
        uint8 homeF,
        uint8 awayQ1,
        uint8 awayQ2,
        uint8 awayQ3,
        uint8 awayF
    ) {
        uint256 packedQuarterScores = gameScores[gameId].packedQuarterScores;

        homeQ1 = uint8((packedQuarterScores >> 248) & 0xFF);
        homeQ2 = uint8((packedQuarterScores >> 240) & 0xFF);
        homeQ3 = uint8((packedQuarterScores >> 232) & 0xFF);
        homeF = uint8((packedQuarterScores >> 224) & 0xFF);
        awayQ1 = uint8((packedQuarterScores >> 216) & 0xFF);
        awayQ2 = uint8((packedQuarterScores >> 208) & 0xFF);
        awayQ3 = uint8((packedQuarterScores >> 200) & 0xFF);
        awayF = uint8((packedQuarterScores >> 192) & 0xFF);
    }

    function timeUntilQuarterScoresCooldownExpires(uint256 gameId) external view returns (uint256) {
        uint256 timeSinceLastRequest = block.timestamp - quarterScoresLastRequestTime[gameId];
        if (timeSinceLastRequest > QUARTER_SCORES_REQUEST_COOLDOWN) {
            return 0;
        }
        return QUARTER_SCORES_REQUEST_COOLDOWN - timeSinceLastRequest;
    }

    function timeUntilScoreChangesCooldownExpires(uint256 gameId) external view returns (uint256) {
        uint256 timeSinceLastRequest = block.timestamp - scoreChangesLastRequestTime[gameId];
        if (timeSinceLastRequest > SCORE_CHANGES_REQUEST_COOLDOWN) {
            return 0;
        }
        return SCORE_CHANGES_REQUEST_COOLDOWN - timeSinceLastRequest;
    }

    function calculateWeekId(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) public pure returns (uint256 weekId) {
        return (year << 16) | (uint256(seasonType) << 8) | uint256(weekNumber);
    }

    function getWeekGames(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external view returns (uint256[] memory gameIds, uint256 submissionDeadline) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        WeekGames memory wg = weekGames[weekId];

        if (!wg.isFinalized) {
            return (new uint256[](0), 0);
        }

        gameIds = new uint256[](wg.gamesCount);
        uint256 gameIndex = 0;

        for (uint256 i = 0; i < wg.packedGameIds.length && gameIndex < wg.gamesCount; i++) {
            uint256 packed = wg.packedGameIds[i];

            uint256 gameId = (packed >> 170) & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }

            gameId = (packed >> 85) & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }

            gameId = packed & ((1 << 85) - 1);
            if (gameId > 0 && gameIndex < wg.gamesCount) {
                gameIds[gameIndex] = gameId;
                gameIndex++;
            }
        }

        submissionDeadline = block.timestamp + 7 days;
        return (gameIds, submissionDeadline);
    }

    function getWeekResults(
        uint256 year,
        uint8 seasonType,
        uint8 weekNumber
    ) external view returns (uint8[] memory winners) {
        uint256 weekId = calculateWeekId(year, seasonType, weekNumber);
        WeekResults memory wr = weekResults[weekId];
        WeekGames memory wg = weekGames[weekId];

        winners = new uint8[](wg.gamesCount);

        for (uint256 i = 0; i < wg.gamesCount; i++) {
            winners[i] = (wr.packedResults & (1 << i)) != 0 ? 1 : 0;
        }

        return winners;
    }
}
