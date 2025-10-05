// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IPickem {
    function contests(uint256 contestId) external view returns (
        uint256 id,
        address creator,
        uint8 seasonType,
        uint8 weekNumber,
        uint256 year,
        address currency,
        uint256 entryFee,
        uint256 totalPrizePool,
        uint256 totalEntries,
        uint256 submissionDeadline,
        bool gamesFinalized,
        bool payoutComplete
    );

    function gameResults(uint256 contestId, uint256 gameId) external view returns (
        uint256 returnedGameId,
        uint8 winner,
        uint256 totalPoints,
        bool isFinalized
    );
}

/**
 * @title PickemNFT
 * @notice ERC721 NFT contract for NFL Pick'em predictions
 * @dev Each NFT represents a user's predictions for all games in a specific week
 */
contract PickemNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;
    using Strings for uint8;
    using Strings for address;

    // ============ Structs ============

    struct PredictionData {
        uint256 contestId;
        address predictor;
        uint256 submissionTime;
        uint256 tiebreakerPoints;
        uint8 correctPicks; // Updated after games complete
        bool claimed; // Whether prize has been claimed
        uint256[] gameIds; // Array of game IDs
        uint8[] picks; // Array of picks (0=away, 1=home) matching gameIds order
    }

    // ============ State Variables ============

    // Main Pickem contract
    address public pickemContract;

    // Prediction data for each token
    mapping(uint256 => PredictionData) public predictions;

    // Base URI for offchain metadata (optional fallback)
    string public baseTokenURI;

    // ============ Events ============

    event PredictionMinted(
        uint256 indexed tokenId,
        uint256 indexed contestId,
        address indexed predictor
    );

    event PredictionScoreUpdated(
        uint256 indexed tokenId,
        uint8 correctPicks
    );

    // ============ Errors ============

    error OnlyPickemContract();
    error TokenDoesNotExist();
    error InvalidGameData();

    // ============ Modifiers ============

    modifier onlyPickemContract() {
        if (msg.sender != pickemContract) revert OnlyPickemContract();
        _;
    }

    // ============ Constructor ============

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {}

    // ============ Minting Functions ============

    /**
     * @notice Mint a new prediction NFT (only callable by Pickem contract)
     * @param to Address to mint the NFT to
     * @param tokenId Token ID to mint
     * @param contestId Contest ID this prediction is for
     * @param gameIds Array of game IDs
     * @param picks Array of picks matching gameIds
     * @param tiebreakerPoints Tiebreaker points prediction
     */
    function mintPrediction(
        address to,
        uint256 tokenId,
        uint256 contestId,
        uint256[] memory gameIds,
        uint8[] memory picks,
        uint256 tiebreakerPoints
    ) external onlyPickemContract {
        if (gameIds.length != picks.length) revert InvalidGameData();

        // Mint the NFT
        _safeMint(to, tokenId);

        // Store prediction data
        PredictionData storage pred = predictions[tokenId];
        pred.contestId = contestId;
        pred.predictor = to;
        pred.submissionTime = block.timestamp;
        pred.tiebreakerPoints = tiebreakerPoints;
        pred.gameIds = gameIds;
        pred.picks = picks;
        pred.correctPicks = 0;
        pred.claimed = false;

        emit PredictionMinted(tokenId, contestId, to);
    }

    /**
     * @notice Update the score for a prediction after games complete
     * @param tokenId Token ID to update
     * @param correctPicks Number of correct picks
     */
    function updateScore(
        uint256 tokenId,
        uint8 correctPicks
    ) external onlyPickemContract {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        predictions[tokenId].correctPicks = correctPicks;

        emit PredictionScoreUpdated(tokenId, correctPicks);
    }

    /**
     * @notice Mark a prediction as claimed
     * @param tokenId Token ID to mark as claimed
     */
    function markClaimed(uint256 tokenId) external onlyPickemContract {
        predictions[tokenId].claimed = true;
    }

    // ============ Metadata Functions ============

    /**
     * @notice Generate fully onchain metadata for a prediction NFT
     * @param tokenId Token ID to get metadata for
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        PredictionData memory pred = predictions[tokenId];

        // Try to get contest info from Pickem contract
        string memory contestInfo = _getContestInfo(pred.contestId);

        // Generate SVG image
        string memory svgImage = _generateSVG(tokenId, pred);

        // Build metadata JSON
        string memory json = string(abi.encodePacked(
            '{"name": "NFL Pick\'em #', tokenId.toString(), '",',
            '"description": "', contestInfo, ' - ', pred.gameIds.length.toString(), ' games picked",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svgImage)), '",',
            '"attributes": [',
                _generateAttributes(pred),
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    /**
     * @notice Generate simple SVG image for the NFT
     */
    function _generateSVG(uint256 tokenId, PredictionData memory pred) internal view returns (string memory) {
        string memory scoreDisplay = pred.correctPicks > 0
            ? string(abi.encodePacked(pred.correctPicks.toString(), "/", pred.gameIds.length.toString()))
            : "Pending";

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#1a1a2e"/>',
            '<text x="200" y="60" font-size="24" fill="#fff" text-anchor="middle">Pick\'em #', tokenId.toString(), '</text>',
            '<text x="200" y="120" font-size="16" fill="#888" text-anchor="middle">Contest ', pred.contestId.toString(), '</text>',
            '<text x="200" y="180" font-size="14" fill="#4fbdba" text-anchor="middle">', pred.gameIds.length.toString(), ' Games</text>',
            '<text x="200" y="280" font-size="32" fill="#e94560" text-anchor="middle">', scoreDisplay, '</text>',
            '</svg>'
        ));
    }

    /**
     * @notice Generate attributes for metadata
     */
    function _generateAttributes(PredictionData memory pred) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"trait_type": "Contest ID", "value": "', pred.contestId.toString(), '"},',
            '{"trait_type": "Total Games", "value": "', pred.gameIds.length.toString(), '"},',
            '{"trait_type": "Correct Picks", "value": "', pred.correctPicks.toString(), '"},',
            '{"trait_type": "Tiebreaker Points", "value": "', pred.tiebreakerPoints.toString(), '"},',
            '{"trait_type": "Submission Time", "value": "', pred.submissionTime.toString(), '"},',
            '{"trait_type": "Prize Claimed", "value": "', pred.claimed ? "Yes" : "No", '"}'
        ));
    }

    /**
     * @notice Get contest info from Pickem contract
     */
    function _getContestInfo(uint256 contestId) internal view returns (string memory) {
        try IPickem(pickemContract).contests(contestId) returns (
            uint256,
            address,
            uint8 seasonType,
            uint8 weekNumber,
            uint256 year,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            bool,
            bool
        ) {
            string memory season = seasonType == 1 ? "Preseason" : seasonType == 2 ? "Regular" : "Postseason";
            return string(abi.encodePacked(
                year.toString(), " ", season, " Week ", weekNumber.toString()
            ));
        } catch {
            return "NFL Pick'em Contest";
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the Pickem contract address
     * @param _pickemContract Address of the main Pickem contract
     */
    function setPickemContract(address _pickemContract) external onlyOwner {
        require(_pickemContract != address(0), "Invalid address");
        pickemContract = _pickemContract;
    }

    /**
     * @notice Set base URI for metadata (optional fallback)
     * @param _baseTokenURI Base URI string
     */
    function setBaseTokenURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
    }


    // ============ View Functions ============

    /**
     * @notice Get full prediction data for a token
     * @param tokenId Token ID
     */
    function getPredictionData(uint256 tokenId) external view returns (PredictionData memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return predictions[tokenId];
    }

    /**
     * @notice Get all token IDs owned by a user
     * @param owner Address to query
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokens;
    }

    /**
     * @notice Check if a token exists
     * @param tokenId Token ID to check
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @notice Get picks for specific games
     * @param tokenId Token ID
     * @param gameIndices Indices of games to get picks for
     */
    function getPicksForGames(
        uint256 tokenId,
        uint256[] memory gameIndices
    ) external view returns (uint8[] memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        PredictionData memory pred = predictions[tokenId];
        uint8[] memory selectedPicks = new uint8[](gameIndices.length);

        for (uint256 i = 0; i < gameIndices.length; i++) {
            require(gameIndices[i] < pred.picks.length, "Invalid game index");
            selectedPicks[i] = pred.picks[gameIndices[i]];
        }

        return selectedPicks;
    }

}
