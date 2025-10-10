// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";
import {IPickemNFT} from "./IPickemNFT.sol";

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
        uint256 payoutDeadline; // 24 hours after games finalized - when payouts can start
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
        bool scoreCalculated; // Whether score has been calculated
        bool claimed; // Whether user has claimed their prize
        mapping(uint256 => uint8) picks; // gameId => 0=away, 1=home, 2=not picked
    }

    struct GameResult {
        uint256 gameId;
        uint8 winner; // 0=away, 1=home, 2=tie/not finished
        uint256 totalPoints; // For tiebreaker
        bool isFinalized;
    }

    struct LeaderboardEntry {
        uint256 tokenId;
        uint8 score;
        uint256 tiebreakerPoints;
        uint256 submissionTime;
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

    // PickemNFT contract
    IPickemNFT public pickemNFT;

    // Treasury fee (2% matching Contests.sol)
    uint256 public constant TREASURY_FEE = 20; // 20/1000 = 2%
    uint256 public constant PERCENT_DENOMINATOR = 1000;

    // Maximum games per week (safety limit)
    uint256 public constant MAX_GAMES_PER_WEEK = 16;

    // Score calculation period (24 hours)
    uint256 public constant SCORE_CALCULATION_PERIOD = 24 hours;

    // Mappings
    mapping(uint256 => PickemContest) public contests;
    mapping(uint256 => UserPrediction) public predictions; // tokenId => prediction
    mapping(uint256 => mapping(address => uint256[])) public userTokens; // contestId => user => array of tokenIds
    mapping(uint256 => mapping(uint256 => GameResult)) public gameResults; // contestId => gameId => result
    mapping(uint256 => LeaderboardEntry[]) public contestLeaderboard; // contestId => top N entries (sorted)
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

    event LeaderboardUpdated(
        uint256 indexed contestId,
        uint256 indexed tokenId,
        uint8 score,
        uint256 position
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

    event ScoreCalculated(
        uint256 indexed contestId,
        uint256 indexed tokenId,
        uint8 correctPicks
    );

    event PayoutPeriodStarted(
        uint256 indexed contestId,
        uint256 deadline
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
    error GamesNotFetched();
    error ScoreAlreadyCalculated();
    error ScoreNotCalculated();
    error InvalidTokenId();
    error PayoutPeriodNotStarted();

    // ============ Constructor ============

    constructor(
        address _treasury,
        address _gameScoreOracle
    ) ConfirmedOwner(msg.sender) {
        require(_treasury != address(0), "Invalid treasury");
        require(_gameScoreOracle != address(0), "Invalid oracle");

        treasury = _treasury;
        gameScoreOracle = GameScoreOracle(_gameScoreOracle);
        // pickemNFT will be set via setPickemNFT after deployment
    }

    // ============ Contest Creation ============

    /**
     * @notice Create a new pick'em contest for a specific week
     * @param seasonType 1=preseason, 2=regular, 3=postseason
     * @param weekNumber Week number within the season
     * @param year The year of the season
     * @param currency Token address for entry fee (address(0) for ETH)
     * @param entryFee Cost to submit predictions
     * @param payoutType 0=winner-take-all, 1=top3, 2=top5
     * @param customDeadline Optional custom submission deadline (0 to use oracle default)
     */
    function createContest(
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year,
        address currency,
        uint256 entryFee,
        uint8 payoutType,
        uint256 customDeadline
    ) external returns (uint256 contestId) {
        // Validate inputs
        if (seasonType < 1 || seasonType > 3) revert InvalidSeasonType();
        if (weekNumber < 1 || weekNumber > 18) revert InvalidWeekNumber();
        if (entryFee == 0) revert InvalidEntryFee();

        // Fetch games from oracle for this week
        (uint256[] memory gameIds, uint256 defaultDeadline) = gameScoreOracle.getWeekGames(year, seasonType, weekNumber);
        if (gameIds.length == 0) revert NoGamesProvided();
        if (gameIds.length > MAX_GAMES_PER_WEEK) revert TooManyGames();

        // Use custom deadline if provided, otherwise use oracle default
        uint256 submissionDeadline = customDeadline > 0 ? customDeadline : defaultDeadline;

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
     * @param picks Array of predictions (0=away, 1=home) matching gameIds order
     * @param tiebreakerPoints Total points prediction for tiebreaker
     */
    function submitPredictions(
        uint256 contestId,
        uint8[] memory picks,
        uint256 tiebreakerPoints
    ) external payable returns (uint256 tokenId) {
        // Load contest struct to memory for cheaper lookups
        PickemContest storage contestStorage = contests[contestId];
        PickemContest memory contest = contestStorage;

        // Validations
        if (contest.id != contestId) revert ContestDoesNotExist();
        if (block.timestamp >= contest.submissionDeadline) revert SubmissionDeadlinePassed();
        if (picks.length != contest.gameIds.length) revert InvalidPredictions();

        // Validate each prediction is 0 or 1
        for (uint256 i = 0; i < picks.length; i++) {
            if (picks[i] > 1) revert InvalidPredictions();
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
            prediction.picks[contest.gameIds[i]] = picks[i];
        }

        // Mint NFT if contract is set
        if (address(pickemNFT) != address(0)) {
            pickemNFT.mintPrediction(
                msg.sender,
                tokenId,
                contestId,
                contest.gameIds,
                picks,
                tiebreakerPoints
            );
        }

        // Update contest state in storage
        contestStorage.totalPrizePool += contest.entryFee;
        contestStorage.totalEntries++;

        // Track user's token for this contest
        userTokens[contestId][msg.sender].push(tokenId);

        // Only add to userContests if this is the user's first entry in this contest
        if (userTokens[contestId][msg.sender].length == 1) {
            userContests[msg.sender].push(contestId);
        }

        emit PredictionSubmitted(contestId, msg.sender, tokenId);
    }

    // ============ Game Results & Scoring ============

    /**
     * @notice Update all game results for a contest from oracle data
     * @param contestId The contest to update
     */
    function updateContestResults(uint256 contestId) external {
        // Load contest to memory for read-only operations
        PickemContest memory contestMem = contests[contestId];
        if (contestMem.id != contestId) revert ContestDoesNotExist();

        // Get results from oracle
        uint8[] memory winners = gameScoreOracle.getWeekResults(
            contestMem.year,
            contestMem.seasonType,
            contestMem.weekNumber
        );

        if (winners.length == 0 || winners.length != contestMem.gameIds.length) {
            revert GamesNotFetched();
        }

        // Update results for each game in storage
        for (uint256 i = 0; i < contestMem.gameIds.length; i++) {
            uint256 gameId = contestMem.gameIds[i];
            // Prepare GameResult in memory, then write to storage
            GameResult memory resultMem = GameResult({
                gameId: gameId,
                winner: winners[i],
                totalPoints: 0, // Not used for pick'em
                isFinalized: true
            });
            gameResults[contestId][gameId] = resultMem;
        }

        // Mark contest as finalized in storage only if not already finalized
        if (!contests[contestId].gamesFinalized) {
            contests[contestId].gamesFinalized = true;
            contests[contestId].payoutDeadline = block.timestamp + SCORE_CALCULATION_PERIOD;
            emit GamesFinalized(contestId);
            emit PayoutPeriodStarted(contestId, contests[contestId].payoutDeadline);
        }
    }

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
            contestStorage.payoutDeadline = block.timestamp + SCORE_CALCULATION_PERIOD;
            emit GamesFinalized(contestId);
            emit PayoutPeriodStarted(contestId, contestStorage.payoutDeadline);
        }
    }

    /**
     * @notice Calculate score for a specific prediction (permissionless)
     * @param tokenId The token ID to calculate score for
     */
    function calculateScore(uint256 tokenId) external {
        if (tokenId >= nextTokenId) revert InvalidTokenId();

        // Load prediction to storage pointer for minimal reads
        UserPrediction storage predictionStorage = predictions[tokenId];

        // Read scoreCalculated once and revert early if already calculated
        if (predictionStorage.scoreCalculated) revert ScoreAlreadyCalculated();

        // Read contestId to memory
        uint256 contestId = predictionStorage.contestId;

        // Check if contest is finalized (single storage read)
        if (!contests[contestId].gamesFinalized) revert ContestNotFinalized();

        // Calculate score (view function, no storage writes)
        uint8 correctPicks = _calculateScore(contestId, tokenId);

        // Write to storage - mark as calculated
        predictionStorage.correctPicks = correctPicks;
        predictionStorage.scoreCalculated = true;

        // Update NFT score if contract is set
        if (address(pickemNFT) != address(0)) {
            pickemNFT.updateScore(tokenId, correctPicks);
        }

        emit ScoreCalculated(contestId, tokenId, correctPicks);

        // Update leaderboard if score qualifies for top N
        _updateLeaderboard(
            contestId,
            tokenId,
            correctPicks,
            predictionStorage.tiebreakerPoints,
            predictionStorage.submissionTime
        );
    }

    /**
     * @notice Calculate scores for multiple predictions in batch (permissionless)
     * @param tokenIds Array of token IDs to calculate scores for
     */
    function calculateScoresBatch(uint256[] calldata tokenIds) external {
        // Cache to avoid repeated storage reads for same contest
        uint256 cachedContestId = type(uint256).max;
        bool cachedGamesFinalized;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];

            if (tokenId >= nextTokenId) revert InvalidTokenId();

            // Get storage pointer but minimize reads
            UserPrediction storage predictionStorage = predictions[tokenId];

            // Read scoreCalculated once - skip if already done
            if (predictionStorage.scoreCalculated) continue;

            // Read contestId to memory
            uint256 contestId = predictionStorage.contestId;

            // Only read contest finalization status if different from cached contest
            if (contestId != cachedContestId) {
                cachedContestId = contestId;
                cachedGamesFinalized = contests[contestId].gamesFinalized;
            }

            // Skip if contest not finalized
            if (!cachedGamesFinalized) continue;

            // Calculate score (view function, no storage writes)
            uint8 correctPicks = _calculateScore(contestId, tokenId);

            // Read tiebreaker data to memory once
            uint256 tiebreakerPoints = predictionStorage.tiebreakerPoints;
            uint256 submissionTime = predictionStorage.submissionTime;

            // Write to storage - two SSTOREs per iteration
            predictionStorage.correctPicks = correctPicks;
            predictionStorage.scoreCalculated = true;

            // Update NFT score if contract is set
            if (address(pickemNFT) != address(0)) {
                pickemNFT.updateScore(tokenId, correctPicks);
            }

            emit ScoreCalculated(contestId, tokenId, correctPicks);

            // Update leaderboard if score qualifies for top N
            _updateLeaderboard(contestId, tokenId, correctPicks, tiebreakerPoints, submissionTime);
        }
    }

    /**
     * @notice Update leaderboard with a new score (internal helper)
     * @dev Maintains a sorted leaderboard of top N entries where N = payout positions
     * @param contestId The contest ID
     * @param tokenId The token ID that scored
     * @param score The score achieved
     * @param tiebreakerPoints Tiebreaker prediction
     * @param submissionTime When the prediction was submitted
     */
    function _updateLeaderboard(
        uint256 contestId,
        uint256 tokenId,
        uint8 score,
        uint256 tiebreakerPoints,
        uint256 submissionTime
    ) internal {
        // Get leaderboard storage reference and load to memory
        LeaderboardEntry[] storage leaderboard = contestLeaderboard[contestId];

        // Get max entries needed from payout structure
        uint256 maxEntries = contests[contestId].payoutStructure.payoutPercentages.length;

        // Create new entry
        LeaderboardEntry memory newEntry = LeaderboardEntry({
            tokenId: tokenId,
            score: score,
            tiebreakerPoints: tiebreakerPoints,
            submissionTime: submissionTime
        });

        uint256 insertPos;

        // If leaderboard is empty or not full, try to add
        if (leaderboard.length < maxEntries) {
            // Find insertion position
            insertPos = leaderboard.length;
            for (uint256 i = 0; i < leaderboard.length; i++) {
                if (_isEntryBetter(newEntry, leaderboard[i], contestId)) {
                    insertPos = i;
                    break;
                }
            }

            // Insert entry
            leaderboard.push(newEntry);

            // Shift entries down if needed
            for (uint256 i = leaderboard.length - 1; i > insertPos; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
            leaderboard[insertPos] = newEntry;

            emit LeaderboardUpdated(contestId, tokenId, score, insertPos);
            return;
        }

        // Leaderboard is full - check if new entry beats the worst entry
        LeaderboardEntry memory worstEntry = leaderboard[leaderboard.length - 1];

        if (!_isEntryBetter(newEntry, worstEntry, contestId)) {
            // New entry doesn't make the cut
            return;
        }

        // Find insertion position
        insertPos = leaderboard.length - 1;
        for (uint256 i = 0; i < leaderboard.length - 1; i++) {
            if (_isEntryBetter(newEntry, leaderboard[i], contestId)) {
                insertPos = i;
                break;
            }
        }

        // Shift entries down and insert
        for (uint256 i = leaderboard.length - 1; i > insertPos; i--) {
            leaderboard[i] = leaderboard[i - 1];
        }
        leaderboard[insertPos] = newEntry;

        emit LeaderboardUpdated(contestId, tokenId, score, insertPos);
    }

    /**
     * @notice Compare two leaderboard entries to determine which is better
     * @dev Returns true if entryA is better than entryB
     */
    function _isEntryBetter(
        LeaderboardEntry memory entryA,
        LeaderboardEntry memory entryB,
        uint256 contestId
    ) internal view returns (bool) {
        // Higher score is better
        if (entryA.score > entryB.score) return true;
        if (entryA.score < entryB.score) return false;

        // Same score - use tiebreaker (closer to actual total points)
        uint256[] memory gameIds = contests[contestId].gameIds;
        uint256 tiebreakerGameId = gameIds[gameIds.length - 1];
        uint256 actualTotalPoints = gameResults[contestId][tiebreakerGameId].totalPoints;

        uint256 diffA = actualTotalPoints > entryA.tiebreakerPoints
            ? actualTotalPoints - entryA.tiebreakerPoints
            : entryA.tiebreakerPoints - actualTotalPoints;

        uint256 diffB = actualTotalPoints > entryB.tiebreakerPoints
            ? actualTotalPoints - entryB.tiebreakerPoints
            : entryB.tiebreakerPoints - actualTotalPoints;

        // Closer tiebreaker is better
        if (diffA < diffB) return true;
        if (diffA > diffB) return false;

        // Same tiebreaker - earlier submission wins
        return entryA.submissionTime < entryB.submissionTime;
    }

    /**
     * @notice Helper function to calculate score for a prediction
     * @dev Optimized to minimize storage reads
     */
    function _calculateScore(uint256 contestId, uint256 tokenId) internal view returns (uint8) {
        // Get storage pointers
        UserPrediction storage predictionStorage = predictions[tokenId];

        // Load gameIds array to memory once
        uint256[] memory gameIds = contests[contestId].gameIds;
        uint8 correctPicks = 0;

        // Iterate through games - each gameResult is loaded to memory once
        for (uint256 i = 0; i < gameIds.length; i++) {
            uint256 gameId = gameIds[i];
            GameResult memory result = gameResults[contestId][gameId];

            // Only need to read pick from storage once per game
            if (result.isFinalized && predictionStorage.picks[gameId] == result.winner) {
                correctPicks++;
            }
        }

        return correctPicks;
    }

    // ============ Prize Claims ============

    /**
     * @notice Claim prize for a winning prediction
     * @param contestId The contest to claim from
     * @param tokenId The specific token ID to claim for
     */
    function claimPrize(uint256 contestId, uint256 tokenId) external {
        // Load contest struct into memory for cheaper access
        PickemContest memory contestMem = contests[contestId];
        if (!contestMem.gamesFinalized) revert ContestNotFinalized();

        // Check if payout period has started (24 hours after finalization)
        if (block.timestamp < contestMem.payoutDeadline) revert PayoutPeriodNotStarted();

        // Verify the caller owns this token
        uint256[] memory userTokenList = userTokens[contestId][msg.sender];
        bool ownsToken = false;
        for (uint256 i = 0; i < userTokenList.length; i++) {
            if (userTokenList[i] == tokenId) {
                ownsToken = true;
                break;
            }
        }
        if (!ownsToken) revert NoPrizeToClain();

        // Check if already claimed
        UserPrediction storage predictionStorage = predictions[tokenId];
        if (predictionStorage.claimed) revert AlreadyClaimed();

        // Check leaderboard to see if this token won
        LeaderboardEntry[] memory leaderboard = contestLeaderboard[contestId];
        uint256 winnerIndex = type(uint256).max;

        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].tokenId == tokenId) {
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

        // Mark as claimed in storage
        predictions[tokenId].claimed = true;

        // Mark NFT as claimed if contract is set
        if (address(pickemNFT) != address(0)) {
            pickemNFT.markClaimed(tokenId);
        }

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
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (!predictions[leaderboard[i].tokenId].claimed) {
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

    /**
     * @notice Claim all prizes for a user's winning predictions in a contest
     * @param contestId The contest to claim from
     */
    function claimAllPrizes(uint256 contestId) external {
        // Load contest struct into memory for cheaper access
        PickemContest memory contestMem = contests[contestId];
        if (!contestMem.gamesFinalized) revert ContestNotFinalized();

        // Check if payout period has started (24 hours after finalization)
        if (block.timestamp < contestMem.payoutDeadline) revert PayoutPeriodNotStarted();

        // Get all user's tokens for this contest
        uint256[] memory userTokenList = userTokens[contestId][msg.sender];
        if (userTokenList.length == 0) revert NoPrizeToClain();

        // Get contest leaderboard
        LeaderboardEntry[] memory leaderboard = contestLeaderboard[contestId];

        uint256 totalPrizeAmount = 0;
        uint256[] memory winningTokens = new uint256[](userTokenList.length);
        uint256 winningTokenCount = 0;

        // Check each user token to see if it's on the leaderboard
        for (uint256 i = 0; i < userTokenList.length; i++) {
            uint256 tokenId = userTokenList[i];

            // Skip if already claimed
            if (predictions[tokenId].claimed) continue;

            // Check if this token is on the leaderboard
            for (uint256 j = 0; j < leaderboard.length; j++) {
                if (leaderboard[j].tokenId == tokenId) {
                    // Calculate prize for this winning position
                    uint256 totalPrizePoolAfterFee = contestMem.totalPrizePool - (contestMem.totalPrizePool * TREASURY_FEE / PERCENT_DENOMINATOR);
                    uint256 prizeAmount = 0;

                    if (j < contestMem.payoutStructure.payoutPercentages.length) {
                        prizeAmount = totalPrizePoolAfterFee * contestMem.payoutStructure.payoutPercentages[j] / PERCENT_DENOMINATOR;
                    }

                    if (prizeAmount > 0) {
                        totalPrizeAmount += prizeAmount;
                        winningTokens[winningTokenCount] = tokenId;
                        winningTokenCount++;

                        // Mark as claimed
                        predictions[tokenId].claimed = true;

                        // Mark NFT as claimed if contract is set
                        if (address(pickemNFT) != address(0)) {
                            pickemNFT.markClaimed(tokenId);
                        }
                    }

                    break; // Found this token on leaderboard, move to next token
                }
            }
        }

        if (totalPrizeAmount == 0) revert NoPrizeToClain();

        // Transfer total prize amount
        if (contestMem.currency == address(0)) {
            (bool sent,) = payable(msg.sender).call{value: totalPrizeAmount}("");
            if (!sent) revert TransferFailed();
        } else {
            IERC20(contestMem.currency).safeTransfer(msg.sender, totalPrizeAmount);
        }

        // Emit events for each claimed prize
        for (uint256 i = 0; i < winningTokenCount; i++) {
            emit PrizeClaimed(contestId, msg.sender, totalPrizeAmount / winningTokenCount);
        }

        // Check if all prizes have been claimed to send treasury fee
        bool allClaimed = true;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (!predictions[leaderboard[i].tokenId].claimed) {
                allClaimed = false;
                break;
            }
        }

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

    /**
     * @notice Get game IDs for a specific contest
     * @param contestId The contest ID
     * @return gameIds Array of ESPN game IDs
     */
    function getContestGameIds(uint256 contestId) external view returns (uint256[] memory) {
        return contests[contestId].gameIds;
    }

    function getContest(uint256 contestId) external view returns (PickemContest memory) {
        return contests[contestId];
    }

    function getUserPrediction(uint256 tokenId) external view returns (
        uint256 contestId,
        address predictor,
        uint256 submissionTime,
        uint256 tiebreakerPoints,
        uint8 correctPicks,
        bool scoreCalculated,
        bool claimed
    ) {
        UserPrediction storage pred = predictions[tokenId];
        return (
            pred.contestId,
            pred.predictor,
            pred.submissionTime,
            pred.tiebreakerPoints,
            pred.correctPicks,
            pred.scoreCalculated,
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
        LeaderboardEntry[] memory leaderboard = contestLeaderboard[contestId];
        uint256[] memory winners = new uint256[](leaderboard.length);

        for (uint256 i = 0; i < leaderboard.length; i++) {
            winners[i] = leaderboard[i].tokenId;
        }

        return winners;
    }

    function getContestLeaderboard(uint256 contestId) external view returns (LeaderboardEntry[] memory) {
        return contestLeaderboard[contestId];
    }

    function getUserContests(address user) external view returns (uint256[] memory) {
        return userContests[user];
    }

    function getUserTokensForContest(uint256 contestId, address user) external view returns (uint256[] memory) {
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

    function setPickemNFT(address _pickemNFT) external onlyOwner {
        require(_pickemNFT != address(0), "Invalid NFT contract");
        pickemNFT = IPickemNFT(_pickemNFT);
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
