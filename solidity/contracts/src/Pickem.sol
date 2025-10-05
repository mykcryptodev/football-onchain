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

    // PickemNFT contract
    IPickemNFT public pickemNFT;

    // Treasury fee (2% matching Contests.sol)
    uint256 public constant TREASURY_FEE = 20; // 20/1000 = 2%
    uint256 public constant PERCENT_DENOMINATOR = 1000;

    // Maximum games per week (safety limit)
    uint256 public constant MAX_GAMES_PER_WEEK = 16;

    // Mappings
    mapping(uint256 => PickemContest) public contests;
    mapping(uint256 => UserPrediction) public predictions; // tokenId => prediction
    mapping(uint256 => mapping(address => uint256[])) public userTokens; // contestId => user => array of tokenIds
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
     */
    function createContest(
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year,
        address currency,
        uint256 entryFee,
        uint8 payoutType
    ) external returns (uint256 contestId) {
        // Validate inputs
        if (seasonType < 1 || seasonType > 3) revert InvalidSeasonType();
        if (weekNumber < 1 || weekNumber > 18) revert InvalidWeekNumber();
        if (entryFee == 0) revert InvalidEntryFee();

        // Fetch games from oracle for this week
        (uint256[] memory gameIds, uint256 submissionDeadline) = gameScoreOracle.getWeekGames(year, seasonType, weekNumber);
        if (gameIds.length == 0) revert NoGamesProvided();
        if (gameIds.length > MAX_GAMES_PER_WEEK) revert TooManyGames();

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
            emit GamesFinalized(contestId);

            // Calculate winners automatically
            _calculateWinners(contestId);
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

            // Calculate and store score for this prediction
            uint8 correctPicks = _calculateScore(contestId, tokenId);

            // Only write to storage once per prediction
            predictionStorage.correctPicks = correctPicks;

            // Update NFT score if contract is set
            if (address(pickemNFT) != address(0)) {
                pickemNFT.updateScore(tokenId, correctPicks);
            }

            tokenIds[entryCount] = tokenId;
            scores[entryCount] = correctPicks;
            tiebreakers[entryCount] = predictionStorage.tiebreakerPoints;

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
            _applyTiebreaker(contestId, winners, winnerCount);
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

    /**
     * @notice Helper function to calculate score for a prediction
     */
    function _calculateScore(uint256 contestId, uint256 tokenId) internal view returns (uint8) {
        UserPrediction storage predictionStorage = predictions[tokenId];
        PickemContest storage contestStorage = contests[contestId];
        uint8 correctPicks = 0;

        // Calculate correct picks
        for (uint256 i = 0; i < contestStorage.gameIds.length; i++) {
            uint256 gameId = contestStorage.gameIds[i];
            GameResult memory result = gameResults[contestId][gameId];

            if (result.isFinalized && predictionStorage.picks[gameId] == result.winner) {
                correctPicks++;
            }
        }

        return correctPicks;
    }

    /**
     * @notice Helper function to apply tiebreaker logic
     */
    function _applyTiebreaker(
        uint256 contestId,
        uint256[] memory winners,
        uint256 winnerCount
    ) internal view {
        PickemContest storage contestStorage = contests[contestId];
        uint256[] memory gameIds = contestStorage.gameIds;

        // Get tiebreaker game's total points
        uint256 tiebreakerGameId = gameIds[gameIds.length - 1]; // Last game as tiebreaker
        uint256 actualTotalPoints = gameResults[contestId][tiebreakerGameId].totalPoints;

        // Sort winners by closest tiebreaker prediction
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

        // Check if already claimed (can't copy to memory due to mapping)
        UserPrediction storage predictionStorage = predictions[tokenId];
        if (predictionStorage.claimed) revert AlreadyClaimed();

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

    /**
     * @notice Claim all prizes for a user's winning predictions in a contest
     * @param contestId The contest to claim from
     */
    function claimAllPrizes(uint256 contestId) external {
        // Load contest struct into memory for cheaper access
        PickemContest memory contestMem = contests[contestId];
        if (!contestMem.gamesFinalized) revert ContestNotFinalized();

        // Get all user's tokens for this contest
        uint256[] memory userTokenList = userTokens[contestId][msg.sender];
        if (userTokenList.length == 0) revert NoPrizeToClain();

        // Get contest winners
        uint256[] memory winners = contestWinners[contestId];

        uint256 totalPrizeAmount = 0;
        uint256[] memory winningTokens = new uint256[](userTokenList.length);
        uint256 winningTokenCount = 0;

        // Check each user token to see if it's a winner
        for (uint256 i = 0; i < userTokenList.length; i++) {
            uint256 tokenId = userTokenList[i];

            // Skip if already claimed
            if (predictions[tokenId].claimed) continue;

            // Check if this token is a winner
            for (uint256 j = 0; j < winners.length; j++) {
                if (winners[j] == tokenId) {
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

                    break; // Found this token in winners, move to next token
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
        for (uint256 i = 0; i < winners.length; i++) {
            if (!predictions[winners[i]].claimed) {
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
