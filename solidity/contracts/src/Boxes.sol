// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import {Contests} from "./Contests.sol";
import {ContestsManager} from "./ContestsManager.sol";
import {IContestTypes} from "./IContestTypes.sol";

contract Boxes is ERC721, ERC721Enumerable, Ownable {
    using Strings for uint256;

    Contests public contests;

    // Add storage for box attributes
    mapping(uint256 => BoxAttributes) private boxAttributes;

    struct BoxAttributes {
        uint256 contestId; // Contest number this box belongs to
    }

    modifier onlyContestContract {
        require(msg.sender == address(contests), "Contests: caller is not the contest contract");
        _;
    }

    constructor()
        ERC721("Boxes", "BOXES")
        Ownable(msg.sender){}

    function setContests(Contests contests_) public onlyOwner {
        contests = contests_;
    }

    function mint(uint256 tokenId) public onlyContestContract {
        _safeMint(address(contests), tokenId);

        // Initialize box attributes
        boxAttributes[tokenId] = BoxAttributes({
            contestId: getTokenIdContestNumber(tokenId)
        });
    }

    // Generate the on-chain metadata
    function generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        BoxAttributes memory attrs = boxAttributes[tokenId];

        // Get the basic JSON structure
        string memory baseJSON = _generateBaseJSON(tokenId, attrs);

        // Get winning status separately
        (bool isWinner, bool hasUnclaimedRewards) = _checkWinningStatus(attrs.contestId, tokenId);

        // Combine everything
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    abi.encodePacked(
                        baseJSON,
                        _generateWinningAttributes(isWinner, hasUnclaimedRewards)
                    )
                )
            )
        );
    }

    function _generateBaseJSON(uint256 tokenId, BoxAttributes memory attrs) private view returns (string memory) {
        (uint256 rowScore, uint256 colScore) = contests.fetchBoxScores(attrs.contestId, tokenId);
        (,,,,,,,,bool randomValuesSet,,) = contests.contests(attrs.contestId);
        return string(
            abi.encodePacked(
                '{',
                '"name": "Box #', tokenId.toString(), '",',
                '"description": "A box from contest #', attrs.contestId.toString(), '",',
                '"attributes": [',
                '{"trait_type": "Home Team Score", "value": "', randomValuesSet ? rowScore.toString() : "TBD", '"},',
                '{"trait_type": "Away Team Score", "value": "', randomValuesSet ? colScore.toString() : "TBD", '"},',
                '{"trait_type": "Scores Assigned", "value": "', randomValuesSet ? "true" : "false", '"},'
            )
        );
    }

    function _checkWinningStatus(uint256 contestId, uint256 tokenId) private view returns (bool isWinner, bool hasUnclaimedRewards) {
        ContestsManager contestsManager = contests.contestsManager();
        IContestTypes.GameScore memory scores = contests.getGameScores(contestsManager.getGameIdForContest(contestId));
        (uint256 rowScore, uint256 colScore) = contests.fetchBoxScores(contestId, tokenId);

        uint8[] memory winningQuarters = contests.getWinningQuarters(
            contestId,
            rowScore,
            colScore,
            scores
        );

        isWinner = winningQuarters.length > 0;

        if (isWinner) {
            for (uint256 i = 0; i < winningQuarters.length; i++) {
                if (!contests.isRewardPaidForQuarter(contestId, winningQuarters[i])) {
                    hasUnclaimedRewards = true;
                    break;
                }
            }
        }
    }

    function _generateWinningAttributes(bool isWinner, bool hasUnclaimedRewards) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"trait_type": "Is Winner", "value": "', isWinner ? "true" : "false", '"},',
                '{"trait_type": "Has Unclaimed Rewards", "value": "', hasUnclaimedRewards ? "true" : "false", '"}',
                ']}'
            )
        );
    }

    // Override tokenURI function to return on-chain metadata
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(tokenId < contests.nextTokenId(), "ERC721Metadata: URI query for nonexistent token");
        return generateTokenURI(tokenId);
    }

    function update(address to, uint256 tokenId, address auth) public onlyContestContract {
        _update(to, tokenId, auth);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function getTokenIdContestNumber(uint256 tokenId) public pure returns (uint256) {
        return tokenId / 100;
    }
}
