// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";
import {Boxes} from "./Boxes.sol";
import {ContestsManager} from "./ContestsManager.sol";
import {IContestTypes} from "./IContestTypes.sol";
import {RandomNumbers} from "./RandomNumbers.sol";
import {IPayoutStrategy} from "./IPayoutStrategy.sol";

contract Contests is ConfirmedOwner, IERC721Receiver {
    using SafeERC20 for IERC20;

    uint256 public nextTokenId;

    // contest counter
    uint256 public contestIdCounter = 0;

    // a list of all contests created
    mapping (uint256 contestId => IContestTypes.Contest contest) internal contests;

    // a list of all contests created by the user
    mapping (address creator => uint256[] contestId) public contestsByUser;

    // the number of boxes on a grid
    uint256 private constant NUM_BOXES_IN_CONTEST = 100;

    // Treasury Address
    address public treasury;

    // Game Score Oracle
    GameScoreOracle public gameScoreOracle;

    // Contest Manager
    ContestsManager public contestsManager;

    // Box NFT
    Boxes public boxes;

    // RandomNumbers contract
    RandomNumbers public randomNumbers;

    // default row and columns
    uint8[] private defaultScores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // treasury fee is set at 2%
    uint256 public constant TREASURY_FEE = 20;
    // denominator for fees and payouts
    uint256 public constant PERCENT_DENOMINATOR = 1000;

    ////////////////////////////////////
    ///////////    EVENTS    ///////////
    ////////////////////////////////////
    event ContestCreated(uint256 indexed contestId, address indexed creator); // someone made a new contest
    event ScoresAssigned(uint256 indexed contestId); // rows and cols were assigned values via the random values from chainlink
    event ScoresRequested(uint256 indexed contestId); // someone requested random numbers for their rows and cols
    event BoxClaimed(uint256 contestId, uint256 tokenId); // someone claimed a box
    event GameScoresRequested(uint256 indexed gameId, bytes32 requestId); // someone requested game scores from the real world
    event GameScoresUpdated(uint256 indexed gameId, bytes32 requestId); // game scores were updated
    event GameScoreError(uint256 indexed gameId, bytes error); // there was an error fetching game scores

    ////////////////////////////////////
    ///////////    ERRORS    ////////////
    ////////////////////////////////////
    error ZeroAddress();
    error InsufficientPayment();
    error BoxAlreadyClaimed();
    error BoxNotInContest();
    error BoxDoesNotExist();
    error RandomValuesAlreadyFetched();
    error CooldownNotMet();
    error FailedToSendETH();
    error RewardsNotClaimable();
    error GameIdNotSet();
    error BoxCostNotSet();
    error BoxesCannotBeClaimed();
    error CallerNotContestCreator();
    error CallerNotRandomNumbers();
    error CallerNotContestsManager();
    error InvalidPayoutStrategy();
    error PayoutAlreadyMade();
    error PayoutCalculationFailed();

    // modifier for only random numbers contract
    modifier onlyRandomNumbers() {
        if (msg.sender != address(randomNumbers)) revert CallerNotRandomNumbers();
        _;
    }

    // modifier for only contests manager contract
    modifier onlyContestsManager() {
        if (msg.sender != address(contestsManager)) revert CallerNotContestsManager();
        _;
    }

    constructor(
        address treasury_,
        Boxes boxes_,
        GameScoreOracle gameScoreOracle_,
        ContestsManager contestsManager_,
        RandomNumbers randomNumbers_
    )
    ConfirmedOwner(msg.sender) {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        boxes = boxes_;
        gameScoreOracle = gameScoreOracle_;
        contestsManager = contestsManager_;
        randomNumbers = randomNumbers_;
    }

    ////////////////////////////////////////////////
    ////////  CONTEST CREATOR FUNCTIONS  ///////////
    ////////////////////////////////////////////////
    /**
        Request randomness to assign numbers to rows and cols
        The contest creator can call this before all boxes are claimed
        Calling this prevents future boxes from being claimed.
     */
    function fetchRandomValues(uint256 _contestId) external payable {
        // Get the current VRF request price from RandomNumbers contract
        uint256 requiredFee = randomNumbers.getCurrentRequestPrice();
        if (msg.value < requiredFee) revert InsufficientPayment();

        // fetch the contest
        IContestTypes.Contest storage contest = contests[_contestId];
        if (contest.randomValuesSet) revert RandomValuesAlreadyFetched();
        if (contest.boxesClaimed != NUM_BOXES_IN_CONTEST) {
            if (msg.sender != contest.creator) revert CallerNotContestCreator();
        }

        // Forward the call to RandomNumbers contract
        randomNumbers.requestRandomNumbers{value: msg.value}(_contestId, msg.sender);

        // Update contest state
        contest.boxesCanBeClaimed = false;

        emit ScoresRequested(_contestId);
    }


    ////////////////////////////////////////////////
    ///////////    PUBLIC FUNCTIONS      ///////////
    ////////////////////////////////////////////////

    /**
        Create a new contest
     */
    function createContest(
        uint256 gameId,
        uint256 boxCost,
        address boxCurrency,
        string memory title,
        string memory description,
        address payoutStrategy
    ) external {
        if (gameId == 0) revert GameIdNotSet();
        if (boxCost == 0) revert BoxCostNotSet();
        if (payoutStrategy == address(0)) revert InvalidPayoutStrategy();

        // Validate that the payout strategy implements the correct interface
        try IPayoutStrategy(payoutStrategy).getStrategyType() returns (bytes32) {
            // Strategy is valid
        } catch {
            revert InvalidPayoutStrategy();
        }

        // Note: Title and description validation is handled in ContestsManager.updateContestInfo()
        // create the contest struct directly in storage
        IContestTypes.Contest storage contest = contests[contestIdCounter];
        contest.id = contestIdCounter; // the id of the contest
        contest.gameId = gameId; // the game that this contest is tied to
        contest.creator = msg.sender; // sender is the creator
        contest.rows = defaultScores; // default rows
        contest.cols = defaultScores; // default cols
        contest.boxCost = IContestTypes.Cost(boxCurrency, boxCost); // the cost of a box
        contest.boxesCanBeClaimed = true; // boxes can be claimed
        contest.payoutsPaid.totalPayoutsMade = 0; // initialize payout tracker
        contest.payoutsPaid.totalAmountPaid = 0; // initialize payout tracker
        contest.totalRewards = 0; // total amount collected for the contest
        contest.boxesClaimed = 0; // no boxes have been claimed yet
        contest.randomValues = new uint [](2); // holds random values to be used when assigning values to rows and cols
        contest.randomValuesSet = false; // chainlink has not yet given us random values for row and col values
        contest.title = title; // the title of the contest
        contest.description = description; // the description of the contest
        contest.payoutStrategy = payoutStrategy; // the payout strategy contract
        // add this to the list of contests created by the user
        contestsByUser[msg.sender].push(contestIdCounter);
        // mint 100 nfts for this contest
        for (uint8 i = 0; i < NUM_BOXES_IN_CONTEST;) {
            boxes.mint(nextTokenId);
            unchecked{ ++nextTokenId; }
            unchecked{ ++i; }
        }
        // emit event
        emit ContestCreated(contestIdCounter, msg.sender);
        // increment for the next contest that gets created
        unchecked{ ++contestIdCounter; }
    }

    /**
        Claim multiple boxes in the same contest
     */
    function claimBoxes(uint256[] memory tokenIds, address player) external payable {
        uint256 contestId = getTokenIdContestNumber(tokenIds[0]);
        // fetch the contest
        IContestTypes.Contest storage contest = contests[contestId];
        // check to make sure that the contest still allows for boxes to be claimed
        if (!contest.boxesCanBeClaimed) revert BoxesCannotBeClaimed();
        // determine cost based on number of boxes to claim
        uint256 numBoxesToClaim = tokenIds.length;
        uint256 totalCost = contest.boxCost.amount * numBoxesToClaim;
        // check to make sure that they sent enough ETH to buy the boxes
        if (contest.boxCost.currency == address(0)) {
            if (totalCost > msg.value) revert InsufficientPayment();
        } else {
            // transfer the tokens to this contract. safeTransferFrom will revert if the transfer fails
            IERC20(contest.boxCost.currency).safeTransferFrom(player, address(this), totalCost);
        }
        // claim the boxes
        for (uint8 i = 0; i < numBoxesToClaim;) {
            uint256 tokenId = tokenIds[i];
            if (getTokenIdContestNumber(tokenId) != contestId) revert BoxNotInContest();
            if (i >= nextTokenId) revert BoxDoesNotExist();
            // check to make sure the box they are trying to claim isnt already claimed
            // check that the owner of this tokenId is this contract address
            if (boxes.ownerOf(tokenId) != address(this)) revert BoxAlreadyClaimed();
            // claim the box by transferring the ownership of this token id from this contract to player
            boxes.update(player, tokenId, address(this));
            // emit event that the box was claimed
            emit BoxClaimed(contestId, tokenId);
            // iterate through the loop
            unchecked{ ++i; }
        }
        // increase the number of boxes claimed in this game
        contest.boxesClaimed += numBoxesToClaim;
        // increase the total amount in the contest by the total amount purchased by this user
        contest.totalRewards += totalCost;

        // refund any excess ETH that was sent
        if (msg.value > totalCost) {
            _sendEth(player, msg.value - totalCost);
        }
    }

    /**
     * @dev Process all available payouts for a contest using its payout strategy
     */
    function processPayouts(uint256 contestId) external {
        IContestTypes.Contest storage contest = contests[contestId];
        if (!contest.randomValuesSet) revert RewardsNotClaimable();

        // Validate game state with the payout strategy
        IPayoutStrategy strategy = IPayoutStrategy(contest.payoutStrategy);
        (bool isValid, string memory reason) = strategy.validateGameState(contest.gameId, gameScoreOracle);
        if (!isValid) revert RewardsNotClaimable();

        // Calculate total pot after treasury fee
        uint256 totalPotAfterFee = contest.totalRewards - (contest.totalRewards * TREASURY_FEE / PERCENT_DENOMINATOR);

        // Get all payouts from the strategy
        try strategy.calculatePayouts(
            contestId,
            contest.gameId,
            totalPotAfterFee,
            gameScoreOracle,
            this.getBoxOwner
        ) returns (IPayoutStrategy.PayoutInfo[] memory payouts) {

            // Process each payout
            for (uint256 i = 0; i < payouts.length; i++) {
                IPayoutStrategy.PayoutInfo memory payout = payouts[i];

                // Generate unique payout ID
                bytes32 payoutId = keccak256(abi.encodePacked(
                    contestId,
                    payout.quarter,
                    payout.eventIndex,
                    payout.reason
                ));

                // Check if this payout has already been made
                if (!contest.payoutsPaid.payoutsMade[payoutId]) {
                    // Mark payout as made
                    contest.payoutsPaid.payoutsMade[payoutId] = true;
                    contest.payoutsPaid.totalPayoutsMade++;
                    contest.payoutsPaid.totalAmountPaid += payout.amount;

                    // Send the payout
                    _sendReward(payout.winner, payout.amount, contest.boxCost.currency);
                }
            }

            // Send treasury fee if final payout is complete
            _sendTreasuryFeeIfComplete(contest);

        } catch {
            revert PayoutCalculationFailed();
        }
    }

    /**
     * @dev Get the owner of a box given the contest ID and row/col scores
     * This function is used as a callback by payout strategies
     */
    function getBoxOwner(uint256 contestId, uint256 rowScore, uint256 colScore) external view returns (address) {
        IContestTypes.Contest storage contest = contests[contestId];

        // Find the box position that matches these scores
        for (uint8 row = 0; row < 10; row++) {
            if (contest.rows[row] == rowScore) {
                for (uint8 col = 0; col < 10; col++) {
                    if (contest.cols[col] == colScore) {
                        uint256 tokenId = contestId * 100 + row * 10 + col;
                        return boxes.ownerOf(tokenId);
                    }
                }
            }
        }

        // Should never reach here if contest is properly set up
        return address(this); // Return contract address if no owner found
    }

    /**
     * @dev Send treasury fee if all payouts are complete
     */
    function _sendTreasuryFeeIfComplete(IContestTypes.Contest storage contest) internal {
        // Check if game is officially completed
        bool gameCompleted = gameScoreOracle.isGameCompleted(contest.gameId);

        if (gameCompleted) {
            _sendTreasuryFee(contest.totalRewards, contest.boxCost.currency);
        }
    }

    function fetchFreshGameScores(
        string[] memory args,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 jobId,
        uint256 gameId
    ) external {
        gameScoreOracle.fetchGameScores(
            args,
            subscriptionId,
            gasLimit,
            jobId,
            gameId
        );
    }

    ////////////////////////////////////////////////
    ///////////   INTERNAL FUNCTIONS     ///////////
    ////////////////////////////////////////////////
    /**
        Returns true if the user owns a box in the given contest
     */
    function _userOwnsBoxInContest (address user, uint256 contestId) internal view returns (bool) {
        // tokenIds 0-99 belong to contestId 0, 100-199 belong to contestId 1, etc.
        // if the user owns an NFT with a tokenId that is less than 100, then they own a box in contestId 0
        uint256 tokenIdRangeToCheck = contestId * 100;
        for (uint8 i = 0; i < 100; i++) {
            if (boxes.ownerOf(tokenIdRangeToCheck + i) == user) {
                return true;
            }
        }
        return false;
    }

    /**
        Send ETH to the treasury account based on the treasury fee amount
     */
    function _sendTreasuryFee (uint256 totalRewards, address currency) internal {
        if (currency == address(0)) {
            _sendEth(treasury, totalRewards * TREASURY_FEE / PERCENT_DENOMINATOR);
        } else {
            IERC20(currency).safeTransfer(treasury, totalRewards * TREASURY_FEE / PERCENT_DENOMINATOR);
        }
    }

    /**
        Send ETH to the treasury account based on the treasury fee amount
     */
    function _sendReward(address winner, uint256 amount, address currency) internal {
        // if nobody claimed this box, send half of the reward to the treasury and the other half to the user who executed this
        // otherwise send the total winnings to the winner
        if (winner == address(this)) {
            if (currency == address(0)) {
                _sendEth(treasury, amount / 2);
                _sendEth(msg.sender, amount / 2);
            } else {
                IERC20(currency).safeTransfer(treasury, amount / 2);
                IERC20(currency).safeTransfer(msg.sender, amount / 2);
            }
        } else {
            if (currency == address(0)) {
                _sendEth(winner, amount);
            } else {
                IERC20(currency).safeTransfer(winner, amount);
            }
        }
    }

    /**
        Given an address and amount, send the amount in ETH to the address
     */
    function _sendEth (address to, uint256 amount) internal {
        (bool sent,) = payable(to).call{ value: amount }("");
        if (!sent) revert FailedToSendETH();
    }

    ////////////////////////////////////////////////
    ///////////     OWNER FUNCTIONS      ///////////
    ////////////////////////////////////////////////

    /**
        Sets The Address Of The Treasury
        @param treasury_ treasury address - cannot be 0
     */
    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
    }

    /**
        Sets The Address Of The Random Numbers Contract
        @param randomNumbers_ random numbers contract address - cannot be 0
     */
    function setRandomNumbers(address randomNumbers_) external onlyOwner {
        if (randomNumbers_ == address(0)) revert ZeroAddress();
        randomNumbers = RandomNumbers(randomNumbers_);
    }

    ////////////////////////////////////////////////
    ///////////      READ FUNCTIONS      ///////////
    ////////////////////////////////////////////////
    /**
        Given a contest and tokenId, return the assigned scores for the box's row and col position
     */
    function fetchBoxScores(
        uint256 contestId, uint256 tokenId
    ) public view returns(uint256 rowScore, uint256 colScore) {
        IContestTypes.Contest storage contest = contests[contestId];
        uint256 boxId = tokenId % 100; // makes this a number between 0-99
        // get the row and col positions of the box
        uint256 colPosition = boxId % 10; // box 45 becomes 5, 245 becomes 5, etc.
        uint256 rowPosition = (boxId - colPosition) * 100 / 1000; // 92 - 2 = 90. 90 * 100 = 9000. 9000 / 1000 = 9th row
        // get the scores of the box
        rowScore = contest.rows[rowPosition];
        colScore = contest.cols[colPosition];
        return (rowScore, colScore);
    }

    /**
     * @dev Check if a specific payout has been made
     */
    function isPayoutMade(uint256 contestId, bytes32 payoutId) public view returns (bool) {
        return contests[contestId].payoutsPaid.payoutsMade[payoutId];
    }

    /**
     * @dev Get payout statistics for a contest
     */
    function getPayoutStats(uint256 contestId) external view returns (
        uint256 totalPayoutsMade,
        uint256 totalAmountPaid
    ) {
        IContestTypes.Contest storage contest = contests[contestId];
        return (contest.payoutsPaid.totalPayoutsMade, contest.payoutsPaid.totalAmountPaid);
    }

    /**
     * @dev Get contest data without mapping fields (for ContestsManager compatibility)
     * Since Contest struct contains mappings, we return a ContestView without those fields
     */
    function getContestData(uint256 contestId) external view returns (IContestTypes.ContestView memory) {
        IContestTypes.Contest storage contest = contests[contestId];

        // Create a new contest view without the mapping fields
        IContestTypes.ContestView memory contestData = IContestTypes.ContestView({
            id: contest.id,
            gameId: contest.gameId,
            creator: contest.creator,
            rows: contest.rows,
            cols: contest.cols,
            boxCost: contest.boxCost,
            boxesCanBeClaimed: contest.boxesCanBeClaimed,
            payoutsPaid: IContestTypes.PayoutTrackerView({
                totalPayoutsMade: contest.payoutsPaid.totalPayoutsMade,
                totalAmountPaid: contest.payoutsPaid.totalAmountPaid
            }),
            totalRewards: contest.totalRewards,
            boxesClaimed: contest.boxesClaimed,
            randomValues: contest.randomValues,
            randomValuesSet: contest.randomValuesSet,
            title: contest.title,
            description: contest.description,
            payoutStrategy: contest.payoutStrategy
        });

        return contestData;
    }

    function getTokenIdContestNumber(uint256 tokenId) public pure returns (uint256) {
        return tokenId / 100;
    }

    /**
     * @dev Get whether random values are set for a contest (for Boxes contract)
     */
    function isRandomValuesSet(uint256 contestId) external view returns (bool) {
        return contests[contestId].randomValuesSet;
    }

    /**
     * @dev Check if a reward has been paid for a quarter (for Boxes contract compatibility)
     * This is a simplified version that checks if any payout has been made
     * In the new system, we don't track quarters specifically anymore
     */
    function isRewardPaidForQuarter(uint256 contestId, uint8 quarter) external view returns (bool) {
        // For now, return false to indicate rewards are always claimable
        // The new payout system handles this differently through processPayouts()
        return false;
    }

    // Essential getter functions (optimized)
    function fetchContestCols(uint256 contestId) external view returns (uint8[] memory) {
        return contests[contestId].cols;
    }

    function fetchContestRows(uint256 contestId) external view returns (uint8[] memory) {
        return contests[contestId].rows;
    }

    function getWinningQuarters(uint256 contestId, uint256 rowScore, uint256 colScore, IContestTypes.GameScore memory gameScores) public view returns (uint8[] memory) {
        if (!contests[contestId].randomValuesSet) return new uint8[](0);
        return contestsManager.calculateWinningQuarters(rowScore, colScore, gameScores);
    }

    function getGameScores(uint256 gameId) public view returns (IContestTypes.GameScore memory) {
        (uint8 homeQ1LastDigit, uint8 homeQ2LastDigit, uint8 homeQ3LastDigit, uint8 homeFLastDigit, uint8 awayQ1LastDigit, uint8 awayQ2LastDigit, uint8 awayQ3LastDigit, uint8 awayFLastDigit, uint8 qComplete, bool requestInProgress) = gameScoreOracle.getGameScores(gameId);
        bool gameCompleted = gameScoreOracle.isGameCompleted(gameId);
        return IContestTypes.GameScore(gameId, homeQ1LastDigit, homeQ2LastDigit, homeQ3LastDigit, homeFLastDigit, awayQ1LastDigit, awayQ2LastDigit, awayQ3LastDigit, awayFLastDigit, qComplete, requestInProgress, gameCompleted);
    }

    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // Add function for RandomNumbers contract to call back
    function fulfillRandomNumbers(
        uint256 contestId,
        uint8[] memory rows,
        uint8[] memory cols
    ) external onlyRandomNumbers {
        IContestTypes.Contest storage contest = contests[contestId];
        contest.randomValuesSet = true;
        contest.rows = rows;
        contest.cols = cols;

        emit ScoresAssigned(contestId);
    }

    /**
        Update contest title and/or description - only callable by ContestsReader
     */
    function updateContestInfoInternal(uint256 _contestId, string memory _newTitle, string memory _newDescription) external onlyContestsManager {
        IContestTypes.Contest storage contest = contests[_contestId];
        contest.title = _newTitle;
        contest.description = _newDescription;
    }
}
