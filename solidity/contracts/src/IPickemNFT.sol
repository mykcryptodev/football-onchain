// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title IPickemNFT
 * @notice Interface for the PickemNFT contract
 */
interface IPickemNFT {
    function mintPrediction(
        address to,
        uint256 tokenId,
        uint256 contestId,
        uint256[] memory gameIds,
        uint8[] memory picks,
        uint256 tiebreakerPoints
    ) external;

    function updateScore(
        uint256 tokenId,
        uint8 correctPicks
    ) external;

    function markClaimed(uint256 tokenId) external;

    function ownerOf(uint256 tokenId) external view returns (address);
}
