"use client";

import {
  getContract,
  prepareContractCall,
  readContract,
  waitForReceipt,
} from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { parseEther } from "viem";

import { chain, pickem, pickemNFT } from "@/constants";
import { abi as oracleAbi } from "@/constants/abis/oracle";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { abi as pickemNFTAbi } from "@/constants/abis/pickemNFT";
import { client } from "@/providers/Thirdweb";

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

    try {
      const tx = prepareContractCall({
        contract: pickemContract,
        method: "createContest",
        params: [
          params.seasonType,
          params.weekNumber,
          BigInt(params.year),
          params.currency,
          parseEther(params.entryFee),
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

      // Extract contest ID from events
      const _event = receipt.logs.find(
        log =>
          log.topics[0] ===
          "0x" + "7d3e2d97e8d8a0f9e7c6a8c6d0e6f5e4d3c2b1a098765432", // ContestCreated event signature
      );

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
      const value =
        params.currency === "0x0000000000000000000000000000000000000000"
          ? parseEther(params.entryFee)
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

  return {
    createContest,
    submitPredictions,
    getContest,
    getUserContests,
    getUserTokens,
    getNextContestId,
    getContestWinners,
    claimPrize,
    claimAllPrizes,
    updateContestResults,
    getNFTMetadata,
    getNFTPrediction,
    getUserNFTBalance,
    getUserNFTByIndex,
    requestWeekGames,
    getWeekGameIds,
    requestWeekResults,
  };
}
