// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {GameScoreOracle} from "./GameScoreOracle.sol";
import {Boxes} from "./Boxes.sol";
import {ContestsReader} from "./ContestsReader.sol";
import {IContestTypes} from "./IContestTypes.sol";
import {RandomNumbers} from "./RandomNumbers.sol";

contract Contests is ConfirmedOwner, IERC721Receiver {
    using SafeERC20 for IERC20;

    uint256 public nextTokenId;

    // contest counter
    uint256 public contestIdCounter = 0;

    // a list of all contests created
    mapping (uint256 contestId => IContestTypes.Contest contest) public contests;

    // a list of all contests created by the user
    mapping (address creator => uint256[] contestId) public contestsByUser;

    // the number of boxes on a grid
    uint256 private constant NUM_BOXES_IN_CONTEST = 100;

    // Treasury Address
    address public treasury;

    // Game Score Oracle
    GameScoreOracle public gameScoreOracle;

    // Contest Reader
    ContestsReader public contestsReader;

    // Box NFT
    Boxes public boxes;

    // RandomNumbers contract
    RandomNumbers public randomNumbers;

    // default row and columns
    uint8[] private defaultScores = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // payouts
    uint256 public constant Q1_PAYOUT = 150; // q1 wins 15% of the pot
    uint256 public constant Q2_PAYOUT = 300; // q2 wins 30% of the pot
    uint256 public constant Q3_PAYOUT = 150; // q3 wins 15% of the pot
    uint256 public constant FINAL_PAYOUT = 380; // final wins 38% of the pot
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

    // modifier for only random numbers contract
    modifier onlyRandomNumbers() {
        if (msg.sender != address(randomNumbers)) revert CallerNotRandomNumbers();
        _;
    }

    constructor(
        address treasury_,
        Boxes boxes_,
        GameScoreOracle gameScoreOracle_,
        ContestsReader contestsReader_,
        RandomNumbers randomNumbers_
    )
    ConfirmedOwner(msg.sender) {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        boxes = boxes_;
        gameScoreOracle = gameScoreOracle_;
        contestsReader = contestsReader_;
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
        IContestTypes.Contest memory contest = contests[_contestId];
        if (contest.randomValuesSet) revert RandomValuesAlreadyFetched();
        if (contest.boxesClaimed != NUM_BOXES_IN_CONTEST) {
            if (msg.sender != contest.creator) revert CallerNotContestCreator();
        }

        // Forward the call to RandomNumbers contract
        randomNumbers.requestRandomNumbers{value: msg.value}(_contestId);

        // Update contest state
        contest.boxesCanBeClaimed = false;
        contests[_contestId] = contest;

        emit ScoresRequested(_contestId);
    }

    ////////////////////////////////////////////////
    ///////////    PUBLIC FUNCTIONS      ///////////
    ////////////////////////////////////////////////

    /**
        Create a new contest
     */
    function createContest(uint256 gameId, uint256 boxCost, address boxCurrency) external {
        if (gameId == 0) revert GameIdNotSet();
        if (boxCost == 0) revert BoxCostNotSet();
        // create the contest struct
        IContestTypes.Contest memory contest = IContestTypes.Contest({
            id: contestIdCounter, // the id of the contest
            gameId: gameId, // the game that this contest is tied to
            creator: msg.sender, // sender is the creator
            rows: defaultScores, // default rows
            cols: defaultScores, // default cols
            boxCost: IContestTypes.Cost(boxCurrency, boxCost), // the cost of a box
            boxesCanBeClaimed: true, // boxes can be claimed
            rewardsPaid: IContestTypes.RewardPayment(false, false, false, false), // rewards have not been paid out yet
            totalRewards: 0, // total amount collected for the contest
            boxesClaimed: 0, // no boxes have been claimed yet
            randomValues: new uint [](2), // holds random values to be used when assigning values to rows and cols
            randomValuesSet: false // chainlink has not yet given us random values for row and col values
        });
        // save this to the list of contests
        contests[contestIdCounter] = contest;
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
        IContestTypes.Contest memory contest = contests[contestId];
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
        // set the contest changes in state
        contests[contestId] = contest;

        // refund any excess ETH that was sent
        if (msg.value > totalCost) {
            _sendEth(player, msg.value - totalCost);
        }
    }

    function claimReward(uint256 contestId, uint256 tokenId) external {
        IContestTypes.Contest storage contest = contests[contestId];
        if (!contest.randomValuesSet) revert RewardsNotClaimable();

        (uint256 rowScore, uint256 colScore) = fetchBoxScores(contest.id, tokenId);
        IContestTypes.GameScore memory gameScores_ = getGameScores(contest.gameId);
        uint8[] memory winningQuarters = getWinningQuarters(contest.id, rowScore, colScore, gameScores_);

        uint256 userReward = calculateAndUpdateRewards(contest, winningQuarters);

        if (userReward > 0) {
            _sendReward(boxes.ownerOf(tokenId), userReward, contest.boxCost.currency);
        }
    }

    function calculateAndUpdateRewards(IContestTypes.Contest storage contest, uint8[] memory winningQuarters) internal returns (uint256) {
        uint256 userReward = 0;
        bool finalPaid = false;

        for (uint8 i = 0; i < winningQuarters.length; i++) {
            uint8 quarter = winningQuarters[i];
            if (!isRewardPaidForQuarter(contest.id, quarter)) {
                userReward += calculateQuarterReward(contest, quarter);
                updateRewardPayment(contest, quarter);
                if (quarter == 4) {
                    finalPaid = true;
                }
            }
        }

        if (finalPaid) {
            _sendTreasuryFee(contest.totalRewards, contest.boxCost.currency);
        }

        return userReward;
    }

    function calculateQuarterReward(IContestTypes.Contest memory contest, uint8 quarter) internal pure returns (uint256) {
        return contest.totalRewards * getQuarterPayout(quarter) / PERCENT_DENOMINATOR;
    }

    function updateRewardPayment(IContestTypes.Contest storage contest, uint8 quarter) internal {
        if (quarter == 1) contest.rewardsPaid.q1Paid = true;
        else if (quarter == 2) contest.rewardsPaid.q2Paid = true;
        else if (quarter == 3) contest.rewardsPaid.q3Paid = true;
        else if (quarter == 4) contest.rewardsPaid.finalPaid = true;
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
        IContestTypes.Contest memory contest = contests[contestId];
        uint256 boxId = tokenId % 100; // makes this a number between 0-99
        // get the row and col positions of the box
        uint256 colPosition = boxId % 10; // box 45 becomes 5, 245 becomes 5, etc.
        uint256 rowPosition = (boxId - colPosition) * 100 / 1000; // 92 - 2 = 90. 90 * 100 = 9000. 9000 / 1000 = 9th row
        // get the scores of the box
        rowScore = contest.rows[rowPosition];
        colScore = contest.cols[colPosition];
        return (rowScore, colScore);
    }

    function isRewardPaidForQuarter(uint256 contestId, uint8 quarter) public view returns (bool) {
        IContestTypes.Contest memory contest = contests[contestId];

        if (quarter == 1) return contest.rewardsPaid.q1Paid;
        if (quarter == 2) return contest.rewardsPaid.q2Paid;
        if (quarter == 3) return contest.rewardsPaid.q3Paid;
        if (quarter == 4) return contest.rewardsPaid.finalPaid;
        return false;
    }

    function getQuarterPayout(uint8 quarter) internal pure returns (uint256) {
        if (quarter == 1) return Q1_PAYOUT;
        if (quarter == 2) return Q2_PAYOUT;
        if (quarter == 3) return Q3_PAYOUT;
        if (quarter == 4) return FINAL_PAYOUT;
        return 0;
    }

    /**
        Read the scores of the cols of a contest
     */
    function fetchContestCols(uint256 contestId) external view returns (uint8[] memory) {
        // fetch the contest object from the id
        IContestTypes.Contest memory contest = contests[contestId];
        return (contest.cols);
    }

    /**
        Read the scores of the rows of a contest
     */
    function fetchContestRows(uint256 contestId) external view returns (uint8[] memory) {
        // fetch the contest object from the id
        IContestTypes.Contest memory contest = contests[contestId];
        return (contest.rows);
    }

    function getWinningQuarters(uint256 contestId, uint256 rowScore, uint256 colScore, IContestTypes.GameScore memory gameScores) public view returns (uint8[] memory) {
        IContestTypes.Contest memory contest = contests[contestId];
        if (!contest.randomValuesSet) {
            return new uint8[](0);
        }

        return contestsReader.calculateWinningQuarters(rowScore, colScore, gameScores);
    }

    function getGameScores(uint256 gameId) public view returns (IContestTypes.GameScore memory) {
        (
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
        ) = gameScoreOracle.getGameScores(gameId);
        return IContestTypes.GameScore({
            id: gameId,
            homeQ1LastDigit: homeQ1LastDigit,
            homeQ2LastDigit: homeQ2LastDigit,
            homeQ3LastDigit: homeQ3LastDigit,
            homeFLastDigit: homeFLastDigit,
            awayQ1LastDigit: awayQ1LastDigit,
            awayQ2LastDigit: awayQ2LastDigit,
            awayQ3LastDigit: awayQ3LastDigit,
            awayFLastDigit: awayFLastDigit,
            qComplete: qComplete,
            requestInProgress: requestInProgress
        });
    }


    function getTokenIdContestNumber(uint256 tokenId) public pure returns (uint256) {
        return tokenId / 100;
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
        IContestTypes.Contest memory contest = contests[contestId];
        contest.randomValuesSet = true;
        contest.rows = rows;
        contest.cols = cols;
        contests[contestId] = contest;

        emit ScoresAssigned(contestId);
    }
}
