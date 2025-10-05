// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";

/**
 * @title Pickem
 * @notice NFL Pick'em contest where users predict winners for all games in a week
 * @dev Predictions are stored as NFTs, winners determined by most correct picks
 */
contract Pickem is ConfirmedOwner, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct PickemContest {
        uint256 id;
        address creator;
        uint8 seasonType; // 1=preseason, 2=regular, 3=postseason
        uint8 weekNumber;
        uint256 year;
        uint256[] gameIds; // ESPN game IDs for the week
        address currency; // Payment token (address(0) for ETH)
        uint256 entryFee;
        uint256 totalPrizePool;
        uint256 totalEntries;
        uint256 submissionDeadline; // First game kickoff time
        bool gamesFinalized; // True when all games are complete
        bool payoutComplete; // True when prizes have been distributed
        PayoutStructure payoutStructure;
    }

    struct PayoutStructure {
        uint8 payoutType; // 0=winner-take-all, 1=top3, 2=top5
        uint256[] payoutPercentages; // Percentage for each place (in basis points)
    }

    struct UserPrediction {
        uint256 contestId;
        address predictor;
        uint256 submissionTime;
        uint256 tiebreakerPoints; // Total points prediction for tiebreaker game
        uint8 correctPicks; // Calculated after games complete
        bool claimed; // Whether user has claimed their prize
        mapping(uint256 => uint8) picks; // gameId => 0=away, 1=home, 2=not picked
    }

    struct GameResult {
        uint256 gameId;
        uint8 winner; // 0=away, 1=home, 2=tie/not finished
        uint256 totalPoints; // For tiebreaker
        bool isFinalized;
    }

    // ============ State Variables ============

    // Contest counter
    uint256 public nextContestId;

    // Prediction NFT token counter
    uint256 public nextTokenId;

    // Treasury address for fees
    address public treasury;

    // Game Score Oracle
    GameScoreOracle public gameScoreOracle;

    // Treasury fee (2% matching Contests.sol)
    uint256 public constant TREASURY_FEE = 20; // 20/1000 = 2%
    uint256 public constant PERCENT_DENOMINATOR = 1000;

    // Maximum games per week (safety limit)
    uint256 public constant MAX_GAMES_PER_WEEK = 16;

    // Mappings
    mapping(uint256 => PickemContest) public contests;
    mapping(uint256 => UserPrediction) public predictions; // tokenId => prediction
    mapping(uint256 => mapping(address => uint256)) public userTokens; // contestId => user => tokenId
    mapping(uint256 => mapping(uint256 => GameResult)) public gameResults; // contestId => gameId => result
    mapping(uint256 => uint256[]) public contestWinners; // contestId => array of winning tokenIds
    mapping(address => uint256[]) public userContests; // user => contestIds they've entered

    // ============ Events ============

    event ContestCreated(
        uint256 indexed contestId,
        address indexed creator,
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year
    );

    event PredictionSubmitted(
        uint256 indexed contestId,
        address indexed predictor,
        uint256 tokenId
    );

    event GamesFinalized(uint256 indexed contestId);

    event WinnersCalculated(
        uint256 indexed contestId,
        uint256[] winnerTokenIds,
        uint8 maxCorrectPicks
    );

    event PrizeClaimed(
        uint256 indexed contestId,
        address indexed winner,
        uint256 amount
    );

    event GameResultUpdated(
        uint256 indexed contestId,
        uint256 indexed gameId,
        uint8 winner,
        uint256 totalPoints
    );

    // ============ Errors ============

    error InvalidSeasonType();
    error InvalidWeekNumber();
    error NoGamesProvided();
    error TooManyGames();
    error InvalidEntryFee();
    error InvalidCurrency();
    error ContestDoesNotExist();
    error SubmissionDeadlinePassed();
    error AlreadySubmitted();
    error InvalidPredictions();
    error InsufficientPayment();
    error ContestNotFinalized();
    error NoPrizeToClain();
    error AlreadyClaimed();
    error TransferFailed();
    error NotAuthorized();
    error InvalidPayoutStructure();
    error PayoutAlreadyComplete();
    error NoWinners();

    // ============ Constructor ============

    constructor(
        address _treasury,
        address _gameScoreOracle
    ) ConfirmedOwner(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_gameScoreOracle != address(0), "Invalid oracle");

        treasury = _treasury;
        gameScoreOracle = GameScoreOracle(_gameScoreOracle);
    }

    // ============ Contest Creation ============

    /**
     * @notice Create a new pick'em contest for a specific week
     * @param seasonType 1=preseason, 2=regular, 3=postseason
     * @param weekNumber Week number within the season
     * @param year The year of the season
     * @param gameIds Array of ESPN game IDs for this week
     * @param currency Token address for entry fee (address(0) for ETH)
     * @param entryFee Cost to submit predictions
     * @param submissionDeadline Timestamp when submissions close (usually first game kickoff)
     * @param payoutType 0=winner-take-all, 1=top3, 2=top5
     */
    function createContest(
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year,
        uint256[] memory gameIds,
        address currency,
        uint256 entryFee,
        uint256 submissionDeadline,
        uint8 payoutType
    ) external returns (uint256 contestId) {
        // Validate inputs
        if (seasonType < 1 || seasonType > 3) revert InvalidSeasonType();
        if (weekNumber < 1 || weekNumber > 18) revert InvalidWeekNumber();
        if (gameIds.length == 0) revert NoGamesProvided();
        if (gameIds.length > MAX_GAMES_PER_WEEK) revert TooManyGames();
        if (entryFee == 0) revert InvalidEntryFee();

        contestId = nextContestId++;

        // Create a memory struct, set all fields, then store to storage
        PickemContest memory contestMem;
        contestMem.id = contestId;
        contestMem.creator = msg.sender;
        contestMem.seasonType = seasonType;
        contestMem.weekNumber = weekNumber;
        contestMem.year = year;
        contestMem.gameIds = gameIds;
        contestMem.currency = currency;
        contestMem.entryFee = entryFee;
        contestMem.submissionDeadline = submissionDeadline;

        // Set payout structure in memory
        contestMem.payoutStructure.payoutType = payoutType;
        if (payoutType == 0) {
            // Winner take all
            uint256[] memory percentages = new uint256[](1);
            percentages[0] = 1000; // 100%
            contestMem.payoutStructure.payoutPercentages = percentages;
        } else if (payoutType == 1) {
            // Top 3: 60%, 30%, 10%
            uint256[] memory percentages = new uint256[](3);
            percentages[0] = 600;
            percentages[1] = 300;
            percentages[2] = 100;
            contestMem.payoutStructure.payoutPercentages = percentages;
        } else if (payoutType == 2) {
            // Top 5: 40%, 25%, 15%, 12%, 8%
            uint256[] memory percentages = new uint256[](5);
            percentages[0] = 400;
            percentages[1] = 250;
            percentages[2] = 150;
            percentages[3] = 120;
            percentages[4] = 80;
            contestMem.payoutStructure.payoutPercentages = percentages;
        } else {
            revert InvalidPayoutStructure();
        }

        // Store the fully populated memory struct to storage
        contests[contestId] = contestMem;

        // Track contest for creator
        userContests[msg.sender].push(contestId);

        emit ContestCreated(contestId, msg.sender, seasonType, weekNumber, year);
    }

    // ============ Prediction Submission ============

    /**
     * @notice Submit predictions for all games in a contest
     * @param contestId The contest to enter
     * @param predictions Array of predictions (0=away, 1=home) matching gameIds order
     * @param tiebreakerPoints Total points prediction for tiebreaker
     */
    function submitPredictions(
        uint256 contestId,
        uint8[] memory predictions,
        uint256 tiebreakerPoints
    ) external payable returns (uint256 tokenId) {
        // Load contest struct to memory for cheaper lookups
        PickemContest storage contestStorage = contests[contestId];
        PickemContest memory contest = contestStorage;

        // Validations
        if (contest.id != contestId) revert ContestDoesNotExist();
        if (block.timestamp >= contest.submissionDeadline) revert SubmissionDeadlinePassed();
        if (userTokens[contestId][msg.sender] != 0) revert AlreadySubmitted();
        if (predictions.length != contest.gameIds.length) revert InvalidPredictions();

        // Validate each prediction is 0 or 1
        for (uint256 i = 0; i < predictions.length; i++) {
            if (predictions[i] > 1) revert InvalidPredictions();
        }

        // Handle payment
        if (contest.currency == address(0)) {
            // ETH payment
            if (msg.value < contest.entryFee) revert InsufficientPayment();

            // Refund excess
            if (msg.value > contest.entryFee) {
                (bool sent,) = payable(msg.sender).call{value: msg.value - contest.entryFee}("");
                if (!sent) revert TransferFailed();
            }
        } else {
            // ERC20 payment
            IERC20(contest.currency).safeTransferFrom(msg.sender, address(this), contest.entryFee);
        }

        // Create prediction NFT
        tokenId = nextTokenId++;

        UserPrediction storage prediction = predictions[tokenId];
        prediction.contestId = contestId;
        prediction.predictor = msg.sender;
        prediction.submissionTime = block.timestamp;
        prediction.tiebreakerPoints = tiebreakerPoints;

        // Store picks
        for (uint256 i = 0; i < contest.gameIds.length; i++) {
            prediction.picks[contest.gameIds[i]] = predictions[i];
        }

        // Update contest state in storage
        contestStorage.totalPrizePool += contest.entryFee;
        contestStorage.totalEntries++;

        // Track user's token for this contest
        userTokens[contestId][msg.sender] = tokenId;
        userContests[msg.sender].push(contestId);

        emit PredictionSubmitted(contestId, msg.sender, tokenId);
    }

    // ============ Game Results & Scoring ============

    /**
     * @notice Update game results for a contest (can be called by oracle or admin)
     * @param contestId The contest to update
     * @param gameId The game ID to update
     * @param winner 0=away, 1=home
     * @param totalPoints Total points scored in the game
     */
    function updateGameResult(
        uint256 contestId,
        uint256 gameId,
        uint8 winner,
        uint256 totalPoints
    ) external onlyOwner {
        // Load contest struct to memory for read-only operations
        PickemContest storage contestStorage = contests[contestId];
        if (contestStorage.id != contestId) revert ContestDoesNotExist();

        // Prepare GameResult in memory, then write to storage at the end
        GameResult memory resultMem = GameResult({
            gameId: gameId,
            winner: winner,
            totalPoints: totalPoints,
            isFinalized: true
        });

        // Write the finalized result to storage in one operation
        gameResults[contestId][gameId] = resultMem;

        emit GameResultUpdated(contestId, gameId, winner, totalPoints);

        // Check if all games are finalized using memory for efficiency
        bool allFinalized = true;
        uint256[] memory gameIds = contestStorage.gameIds;
        for (uint256 i = 0; i < gameIds.length; i++) {
            if (!gameResults[contestId][gameIds[i]].isFinalized) {
                allFinalized = false;
                break;
            }
        }

        // Only write to storage if state changes
        if (allFinalized && !contestStorage.gamesFinalized) {
            contestStorage.gamesFinalized = true;
            emit GamesFinalized(contestId);

            // Calculate winners automatically
            _calculateWinners(contestId);
        }
    }

    /**
     * @notice Calculate winners for a finalized contest
     */
    function _calculateWinners(uint256 contestId) internal {
        // Load contest struct to memory for read-only operations
        PickemContest storage contestStorage = contests[contestId];
        if (!contestStorage.gamesFinalized) revert ContestNotFinalized();

        // Copy needed fields to memory
        uint256 totalEntries = contestStorage.totalEntries;
        uint256[] memory gameIds = contestStorage.gameIds;
        PayoutStructure memory payoutStructure = contestStorage.payoutStructure;

        uint256[] memory tokenIds = new uint256[](totalEntries);
        uint256[] memory scores = new uint256[](totalEntries);
        uint256[] memory tiebreakers = new uint256[](totalEntries);

        uint256 maxScore = 0;
        uint256 entryCount = 0;

        // Iterate through all tokens to find predictions for this contest
        for (uint256 tokenId = 0; tokenId < nextTokenId; tokenId++) {
            UserPrediction storage predictionStorage = predictions[tokenId];
            if (predictionStorage.contestId != contestId) continue;

            // Copy prediction fields to memory for computation
            uint256 tiebreakerPoints = predictionStorage.tiebreakerPoints;
            uint256 submissionTime = predictionStorage.submissionTime;

            uint8 correctPicks = 0;

            // Calculate correct picks
            for (uint256 i = 0; i < gameIds.length; i++) {
                uint256 gameId = gameIds[i];
                GameResult memory result = gameResults[contestId][gameId];

                if (result.isFinalized && predictionStorage.picks[gameId] == result.winner) {
                    correctPicks++;
                }
            }

            // Only write to storage once per prediction
            predictionStorage.correctPicks = correctPicks;

            tokenIds[entryCount] = tokenId;
            scores[entryCount] = correctPicks;
            tiebreakers[entryCount] = tiebreakerPoints;

            if (correctPicks > maxScore) {
                maxScore = correctPicks;
            }

            entryCount++;
        }

        // Find winners (those with max score)
        uint256[] memory winners = new uint256[](entryCount);
        uint256 winnerCount = 0;

        for (uint256 i = 0; i < entryCount; i++) {
            if (scores[i] == maxScore) {
                winners[winnerCount] = tokenIds[i];
                winnerCount++;
            }
        }

        // Apply tiebreaker if needed
        if (winnerCount > 1) {
            // Get tiebreaker game's total points
            uint256 tiebreakerGameId = gameIds[gameIds.length - 1]; // Last game as tiebreaker
            uint256 actualTotalPoints = gameResults[contestId][tiebreakerGameId].totalPoints;

            // Sort winners by closest tiebreaker prediction (using memory copies)
            for (uint256 i = 0; i < winnerCount - 1; i++) {
                for (uint256 j = i + 1; j < winnerCount; j++) {
                    UserPrediction storage predI = predictions[winners[i]];
                    UserPrediction storage predJ = predictions[winners[j]];

                    uint256 diffI = actualTotalPoints > predI.tiebreakerPoints
                        ? actualTotalPoints - predI.tiebreakerPoints
                        : predI.tiebreakerPoints - actualTotalPoints;

                    uint256 diffJ = actualTotalPoints > predJ.tiebreakerPoints
                        ? actualTotalPoints - predJ.tiebreakerPoints
                        : predJ.tiebreakerPoints - actualTotalPoints;

                    // If j is closer, swap
                    if (diffJ < diffI || (diffJ == diffI && predJ.submissionTime < predI.submissionTime)) {
                        uint256 temp = winners[i];
                        winners[i] = winners[j];
                        winners[j] = temp;
                    }
                }
            }
        }

        // Store only the needed winners based on payout structure
        uint256 winnersNeeded = payoutStructure.payoutPercentages.length;
        uint256[] memory finalWinners = new uint256[](winnersNeeded < winnerCount ? winnersNeeded : winnerCount);

        for (uint256 i = 0; i < finalWinners.length; i++) {
            finalWinners[i] = winners[i];
        }

        // Only write to storage once at the end
        contestWinners[contestId] = finalWinners;

        emit WinnersCalculated(contestId, finalWinners, uint8(maxScore));
    }

    // ============ Prize Claims ============

    /**
     * @notice Claim prize for a winning prediction
     * @param contestId The contest to claim from
     */
    function claimPrize(uint256 contestId) external {
        // Load contest struct into memory for cheaper access
        PickemContest memory contestMem = contests[contestId];
        if (!contestMem.gamesFinalized) revert ContestNotFinalized();

        uint256 tokenId = userTokens[contestId][msg.sender];
        if (tokenId == 0) revert NoPrizeToClain();

        // Load prediction struct into memory for cheaper access
        UserPrediction memory predictionMem = predictions[tokenId];
        if (predictionMem.claimed) revert AlreadyClaimed();

        // Check if user is a winner
        uint256[] memory winners = contestWinners[contestId];
        uint256 winnerIndex = type(uint256).max;

        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] == tokenId) {
                winnerIndex = i;
                break;
            }
        }

        if (winnerIndex == type(uint256).max) revert NoPrizeToClain();

        // Calculate prize amount
        uint256 totalPrizePoolAfterFee = contestMem.totalPrizePool - (contestMem.totalPrizePool * TREASURY_FEE / PERCENT_DENOMINATOR);
        uint256 prizeAmount = 0;

        if (winnerIndex < contestMem.payoutStructure.payoutPercentages.length) {
            prizeAmount = totalPrizePoolAfterFee * contestMem.payoutStructure.payoutPercentages[winnerIndex] / PERCENT_DENOMINATOR;
        }

        if (prizeAmount == 0) revert NoPrizeToClain();

        // Mark as claimed in storage (only this field needs to be updated)
        predictions[tokenId].claimed = true;

        // Transfer prize
        if (contestMem.currency == address(0)) {
            (bool sent,) = payable(msg.sender).call{value: prizeAmount}("");
            if (!sent) revert TransferFailed();
        } else {
            IERC20(contestMem.currency).safeTransfer(msg.sender, prizeAmount);
        }

        emit PrizeClaimed(contestId, msg.sender, prizeAmount);

        // If all prizes claimed, send treasury fee
        bool allClaimed = true;
        for (uint256 i = 0; i < winners.length; i++) {
            if (!predictions[winners[i]].claimed) {
                allClaimed = false;
                break;
            }
        }

        // Only update payoutComplete in storage if needed
        if (allClaimed && !contests[contestId].payoutComplete) {
            contests[contestId].payoutComplete = true;
            uint256 treasuryAmount = contestMem.totalPrizePool * TREASURY_FEE / PERCENT_DENOMINATOR;

            if (contestMem.currency == address(0)) {
                (bool sent,) = payable(treasury).call{value: treasuryAmount}("");
                if (!sent) revert TransferFailed();
            } else {
                IERC20(contestMem.currency).safeTransfer(treasury, treasuryAmount);
            }
        }
    }

    // ============ View Functions ============

    function getContest(uint256 contestId) external view returns (PickemContest memory) {
        return contests[contestId];
    }

    function getUserPrediction(uint256 tokenId) external view returns (
        uint256 contestId,
        address predictor,
        uint256 submissionTime,
        uint256 tiebreakerPoints,
        uint8 correctPicks,
        bool claimed
    ) {
        UserPrediction storage pred = predictions[tokenId];
        return (
            pred.contestId,
            pred.predictor,
            pred.submissionTime,
            pred.tiebreakerPoints,
            pred.correctPicks,
            pred.claimed
        );
    }

    function getUserPicks(uint256 tokenId, uint256[] memory gameIds) external view returns (uint8[] memory) {
        UserPrediction storage pred = predictions[tokenId];
        uint8[] memory picks = new uint8[](gameIds.length);

        for (uint256 i = 0; i < gameIds.length; i++) {
            picks[i] = pred.picks[gameIds[i]];
        }

        return picks;
    }

    function getContestWinners(uint256 contestId) external view returns (uint256[] memory) {
        return contestWinners[contestId];
    }

    function getUserContests(address user) external view returns (uint256[] memory) {
        return userContests[user];
    }

    function getUserTokenForContest(uint256 contestId, address user) external view returns (uint256) {
        return userTokens[contestId][user];
    }

    // ============ Admin Functions ============

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setGameScoreOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        gameScoreOracle = GameScoreOracle(_oracle);
    }

    // ============ ERC721 Receiver ============

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
