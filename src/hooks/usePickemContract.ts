"use client";

import {
  getContract,
  prepareContractCall,
  readContract,
  toUnits,
  waitForReceipt,
  ZERO_ADDRESS,
} from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

import { chain, pickem, pickemNFT } from "@/constants";
import { abi as oracleAbi } from "@/constants/abis/oracle";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { abi as pickemNFTAbi } from "@/constants/abis/pickemNFT";
import { client } from "@/providers/Thirdweb";
import { decimals } from "thirdweb/extensions/erc20";
import { isAddressEqual } from "viem";

export function usePickemContract() {
  const account = useActiveAccount();
  const { mutateAsync: sendTx } = useSendTransaction();

  const pickemContract = getContract({
    client,
    chain,
    address: pickem[chain.id],
    abi: pickemAbi,
  });

  const pickemNFTContract = getContract({
    client,
    chain,
    address: pickemNFT[chain.id],
    abi: pickemNFTAbi,
  });

  // Create a new Pick'em contest
  const createContest = async (params: {
    seasonType: number;
    weekNumber: number;
    year: number;
    currency: string; // address or "0x0000000000000000000000000000000000000000" for ETH
    entryFee: string; // in ether units
    payoutType: number;
    customDeadline?: number;
  }) => {
    if (!account) throw new Error("No account connected");

    let currencyDecimals = 18;
    try {
      const tokenContract = getContract({
        client,
        chain,
        address: params.currency,
      });
      currencyDecimals = await decimals({ contract: tokenContract });
    } catch (error) {
      console.error("Error getting currency decimals:", error);
    }

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "createContest",
        params: [
          params.seasonType,
          params.weekNumber,
          BigInt(params.year),
          params.currency,
          toUnits(params.entryFee, currencyDecimals),
          params.payoutType,
          BigInt(params.customDeadline || 0),
        ],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error creating contest:", error);
      throw error;
    }
  };

  // Submit predictions for a contest
  const submitPredictions = async (params: {
    contestId: number;
    picks: number[]; // Array of 0s and 1s
    tiebreakerPoints: number;
    entryFee: string; // in ETH
    currency: string;
  }) => {
    if (!account) throw new Error("No account connected");

    try {
      const value = isAddressEqual(
        params.currency as `0x${string}`,
        ZERO_ADDRESS,
      )
        ? toUnits(params.entryFee, 18)
        : BigInt(0);

      const tx = prepareContractCall({
        contract: pickemContract,
        method: "submitPredictions",
        params: [
          BigInt(params.contestId),
          params.picks,
          BigInt(params.tiebreakerPoints),
        ],
        value,
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error submitting predictions:", error);
      throw error;
    }
  };

  // Get contest details
  const getContest = async (contestId: number) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getContest",
        params: [BigInt(contestId)],
      });
      return result;
    } catch (error) {
      console.error("Error getting contest:", error);
      throw error;
    }
  };

  // Get user's contests
  const getUserContests = async (userAddress: string) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getUserContests",
        params: [userAddress],
      });
      return result;
    } catch (error) {
      console.error("Error getting user contests:", error);
      throw error;
    }
  };

  // Get user's tokens for a contest
  const getUserTokens = async (contestId: number, userAddress: string) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getUserTokensForContest",
        params: [BigInt(contestId), userAddress],
      });
      return result;
    } catch (error) {
      console.error("Error getting user tokens:", error);
      throw error;
    }
  };

  // Get next contest ID
  const getNextContestId = async () => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "nextContestId",
        params: [],
      });
      return Number(result);
    } catch (error) {
      console.error("Error getting next contest ID:", error);
      throw error;
    }
  };

  // Get contest winners
  const getContestWinners = async (contestId: number) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getContestWinners",
        params: [BigInt(contestId)],
      });
      return result;
    } catch (error) {
      console.error("Error getting contest winners:", error);
      throw error;
    }
  };

  // Get contest leaderboard
  const getContestLeaderboard = async (contestId: number) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getContestLeaderboard",
        params: [BigInt(contestId)],
      });
      return result;
    } catch (error) {
      console.error("Error getting contest leaderboard:", error);
      throw error;
    }
  };

  // Claim prize for a token
  const claimPrize = async (contestId: number, tokenId: number) => {
    if (!account) throw new Error("No account connected");

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "claimPrize",
        params: [BigInt(contestId), BigInt(tokenId)],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error claiming prize:", error);
      throw error;
    }
  };

  // Claim all prizes for a contest
  const claimAllPrizes = async (contestId: number) => {
    if (!account) throw new Error("No account connected");

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "claimAllPrizes",
        params: [BigInt(contestId)],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error claiming all prizes:", error);
      throw error;
    }
  };

  // Calculate score for a single token
  const calculateScore = async (tokenId: number) => {
    if (!account) throw new Error("No account connected");

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "calculateScore",
        params: [BigInt(tokenId)],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error calculating score:", error);
      throw error;
    }
  };

  // Calculate scores for multiple tokens in batch
  const calculateScoresBatch = async (tokenIds: number[]) => {
    if (!account) throw new Error("No account connected");

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "calculateScoresBatch",
        params: [tokenIds.map(id => BigInt(id))],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error calculating scores batch:", error);
      throw error;
    }
  };

  // Update contest results (likely admin only)
  const updateContestResults = async (contestId: number) => {
    if (!account) throw new Error("No account connected");

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "updateContestResults",
        params: [BigInt(contestId)],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error updating contest results:", error);
      throw error;
    }
  };

  // Get NFT metadata
  const getNFTMetadata = async (tokenId: number) => {
    try {
      const uri = await readContract({
        contract: pickemNFTContract,
        method: "tokenURI",
        params: [BigInt(tokenId)],
      });

      // Parse base64 encoded JSON
      if (uri.startsWith("data:application/json;base64,")) {
        const base64 = uri.split(",")[1];
        const json = atob(base64);
        return JSON.parse(json);
      }

      return uri;
    } catch (error) {
      console.error("Error getting NFT metadata:", error);
      throw error;
    }
  };

  // Get NFT prediction data
  const getNFTPrediction = async (tokenId: number) => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "predictions",
        params: [BigInt(tokenId)],
      });
      return result;
    } catch (error) {
      console.error("Error getting NFT prediction:", error);
      throw error;
    }
  };

  // Get user's NFT balance
  const getUserNFTBalance = async (userAddress: string) => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "balanceOf",
        params: [userAddress],
      });
      return Number(result);
    } catch (error) {
      console.error("Error getting NFT balance:", error);
      throw error;
    }
  };

  // Get user's NFT token by index
  const getUserNFTByIndex = async (userAddress: string, index: number) => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "tokenOfOwnerByIndex",
        params: [userAddress, BigInt(index)],
      });
      return Number(result);
    } catch (error) {
      console.error("Error getting user NFT by index:", error);
      throw error;
    }
  };

  // Request week games from oracle
  const requestWeekGames = async (params: {
    year: number;
    seasonType: number;
    weekNumber: number;
    subscriptionId: bigint;
    gasLimit: number;
    jobId: `0x${string}`;
  }) => {
    if (!account) throw new Error("No account connected");

    try {
      // First, get oracle address
      const oracleAddress = await readContract({
        contract: pickemContract,
        method: "gameScoreOracle",
        params: [],
      });

      const oracle = getContract({
        client,
        chain,
        address: oracleAddress as `0x${string}`,
        abi: oracleAbi,
      });

      const tx = prepareContractCall({
        contract: oracle,
        method: "fetchWeekGames",
        params: [
          params.subscriptionId,
          params.gasLimit,
          params.jobId,
          BigInt(params.year),
          params.seasonType,
          params.weekNumber,
        ],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error requesting week games:", error);
      throw error;
    }
  };

  // Get week game IDs from oracle
  const getWeekGameIds = async (params: {
    year: number;
    seasonType: number;
    weekNumber: number;
  }) => {
    try {
      const oracleAddress = await readContract({
        contract: pickemContract,
        method: "gameScoreOracle",
        params: [],
      });

      const oracle = getContract({
        client,
        chain,
        address: oracleAddress as `0x${string}`,
        abi: oracleAbi,
      });

      const result = await readContract({
        contract: oracle,
        method: "getWeekGames",
        params: [BigInt(params.year), params.seasonType, params.weekNumber],
      });

      return {
        gameIds: result[0] as bigint[],
        submissionDeadline: Number(result[1]),
      };
    } catch (error) {
      console.error("Error getting week game IDs:", error);
      throw error;
    }
  };

  // Request week results from oracle
  const requestWeekResults = async (params: {
    year: number;
    seasonType: number;
    weekNumber: number;
    subscriptionId: bigint;
    gasLimit: number;
    jobId: `0x${string}`;
  }) => {
    if (!account) throw new Error("No account connected");

    try {
      // First, get oracle address
      const oracleAddress = await readContract({
        contract: pickemContract,
        method: "gameScoreOracle",
        params: [],
      });

      const oracle = getContract({
        client,
        chain,
        address: oracleAddress as `0x${string}`,
        abi: oracleAbi,
      });

      const tx = prepareContractCall({
        contract: oracle,
        method: "fetchWeekResults",
        params: [
          params.subscriptionId,
          params.gasLimit,
          params.jobId,
          BigInt(params.year),
          params.seasonType,
          params.weekNumber,
        ],
      });

      const result = await sendTx(tx);
      const receipt = await waitForReceipt({
        client,
        chain,
        transactionHash: result.transactionHash,
      });

      return receipt;
    } catch (error) {
      console.error("Error requesting week results:", error);
      throw error;
    }
  };

  // Get user picks for a token
  const getUserPicks = async (tokenId: number, gameIds: bigint[]) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getUserPicks",
        params: [BigInt(tokenId), gameIds],
      });
      return result;
    } catch (error) {
      console.error("Error getting user picks:", error);
      throw error;
    }
  };

  // Get total NFT supply
  const getTotalNFTSupply = async () => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "totalSupply",
        params: [],
      });
      return Number(result);
    } catch (error) {
      console.error("Error getting total supply:", error);
      throw error;
    }
  };

  // Get NFT owner by token ID
  const getNFTOwner = async (tokenId: number) => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "ownerOf",
        params: [BigInt(tokenId)],
      });
      return result as string;
    } catch (error) {
      console.error("Error getting NFT owner:", error);
      throw error;
    }
  };

  // Get NFT token by index
  const getTokenByIndex = async (index: number) => {
    try {
      const result = await readContract({
        contract: pickemNFTContract,
        method: "tokenByIndex",
        params: [BigInt(index)],
      });
      return Number(result);
    } catch (error) {
      console.error("Error getting token by index:", error);
      throw error;
    }
  };

  // Get all token IDs for a contest
  const getContestTokenIds = async (contestId: number) => {
    try {
      const result = await readContract({
        contract: pickemContract,
        method: "getContestTokenIds",
        params: [BigInt(contestId)],
      });
      return (result as bigint[]).map(id => Number(id));
    } catch (error) {
      console.error("Error getting contest token IDs:", error);
      throw error;
    }
  };

  return {
    createContest,
    submitPredictions,
    getContest,
    getUserContests,
    getUserTokens,
    getNextContestId,
    getContestWinners,
    getContestLeaderboard,
    getContestTokenIds,
    claimPrize,
    claimAllPrizes,
    calculateScore,
    calculateScoresBatch,
    updateContestResults,
    getNFTMetadata,
    getNFTPrediction,
    getUserNFTBalance,
    getUserNFTByIndex,
    requestWeekGames,
    getWeekGameIds,
    requestWeekResults,
    getUserPicks,
    getTotalNFTSupply,
    getNFTOwner,
    getTokenByIndex,
  };
}
