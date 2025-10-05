import type { Abi } from "abitype";
import { useState } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

import {
  chain,
  chainlinkGasLimit,
  chainlinkJobId,
  chainlinkSubscriptionId,
  contests,
  gameScoreOracle,
} from "@/constants";
import { abi as contestsAbi } from "@/constants/abis/contests";
import { abi as oracleAbi } from "@/constants/abis/oracle";
import { client } from "@/providers/Thirdweb";

export type FetchType = "quarter-scores" | "score-changes";

/**
 * Hook for fetching game data (quarter scores or score changes) onchain by calling
 * the appropriate method on the contests contract. This triggers a Chainlink oracle request.
 */
export function useFetchGameData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendAndConfirmTransaction();

  const contestsContract = getContract({
    client,
    address: contests[chain.id],
    abi: contestsAbi,
    chain,
  });

  const oracleContract = getContract({
    client,
    address: gameScoreOracle[chain.id],
    abi: oracleAbi as Abi, // Type assertion to bypass ABI type issues
    chain,
  });

  const handleFetchGameData = async (
    gameId: number,
    fetchType: FetchType,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ) => {
    if (!account) {
      const error = new Error("No wallet connected");
      setError(error);
      onError?.(error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Chainlink parameters for the current chain
      const subscriptionId = chainlinkSubscriptionId[chain.id];
      const jobId = chainlinkJobId[chain.id];
      const gasLimit = chainlinkGasLimit[chain.id];

      if (!subscriptionId || !jobId || !gasLimit) {
        throw new Error(
          `Chainlink parameters not configured for chain ${chain.id}`,
        );
      }

      // Validate that the subscription ID is a valid number
      if (subscriptionId <= 0) {
        throw new Error("Invalid Chainlink subscription ID");
      }

      // Check cooldown based on fetch type
      const cooldownMethod =
        fetchType === "quarter-scores"
          ? "timeUntilQuarterScoresCooldownExpires"
          : "timeUntilScoreChangesCooldownExpires";

      const timeUntilCooldownExpires = await readContract({
        contract: oracleContract,
        method: `function ${cooldownMethod}(uint256) view returns (uint256)`,
        params: [BigInt(gameId)],
      });

      const remainingTime = Number(timeUntilCooldownExpires);
      if (remainingTime > 0) {
        const remainingMinutes = Math.ceil(remainingTime / 60);
        throw new Error(
          `Please wait ${remainingMinutes} more minutes before requesting ${fetchType} again (cooldown period).`,
        );
      }

      // For score changes, check if game is completed
      if (fetchType === "score-changes") {
        const isGameCompleted = await readContract({
          contract: oracleContract,
          method: "function isGameCompleted(uint256) view returns (bool)",
          params: [BigInt(gameId)],
        });

        if (!isGameCompleted) {
          throw new Error(
            "Game must be completed before fetching score changes",
          );
        }

        // Check if score changes are already stored
        const totalScoreChanges = await readContract({
          contract: oracleContract,
          method: "function getTotalScoreChanges(uint256) view returns (uint8)",
          params: [BigInt(gameId)],
        });

        if (Number(totalScoreChanges) > 0) {
          throw new Error("Score changes are already stored for this game");
        }
      }

      // Log the parameters for debugging
      console.log("Chainlink parameters:", {
        subscriptionId: subscriptionId.toString(),
        jobId,
        gasLimit: gasLimit.toString(),
        gameId: gameId.toString(),
        fetchType,
      });

      // Prepare the contract call based on fetch type
      const methodName =
        fetchType === "quarter-scores"
          ? "fetchFreshGameScores"
          : "fetchFreshScoreChanges";

      const transaction = prepareContractCall({
        contract: contestsContract,
        method: `function ${methodName}(uint64 subscriptionId, uint32 gasLimit, bytes32 jobId, uint256 gameId) external`,
        params: [subscriptionId, Number(gasLimit), jobId, BigInt(gameId)],
      });

      console.log(`Prepared transaction for ${methodName}`);

      // Send the transaction
      sendTransaction(transaction, {
        onSuccess: () => {
          console.log(
            `Successfully initiated ${fetchType} fetch for game ${gameId}`,
          );
          onSuccess?.();
        },
        onError: error => {
          console.error(`Error fetching ${fetchType}:`, error);
          console.error("Full error object:", JSON.stringify(error, null, 2));

          // Handle specific error cases
          let errorMessage = `Failed to fetch ${fetchType}`;

          if (error.message?.includes("0x1d70f87a")) {
            errorMessage =
              "Chainlink Functions error. This may be due to invalid subscription, insufficient LINK balance, or invalid request parameters.";
          } else if (error.message?.includes("CooldownNotMet")) {
            errorMessage = `Please wait before requesting ${fetchType} again (cooldown period).`;
          } else if (error.message?.includes("GameNotCompleted")) {
            errorMessage =
              "Game must be completed before fetching score changes.";
          } else if (error.message?.includes("ScoreChangesAlreadyStored")) {
            errorMessage = "Score changes are already stored for this game.";
          } else if (
            error.message?.includes("AbiErrorSignatureNotFoundError")
          ) {
            errorMessage =
              "Contract error occurred. This may be due to insufficient LINK tokens or invalid subscription.";
          } else if (error.message?.includes("InvalidSubscription")) {
            errorMessage =
              "Invalid Chainlink subscription. Please check if subscription ID exists and is active.";
          } else if (error.message?.includes("InsufficientBalance")) {
            errorMessage =
              "Insufficient LINK balance in subscription. Please add more LINK tokens.";
          } else if (error.message?.includes("InvalidRequest")) {
            errorMessage =
              "Invalid request parameters. Please check the game ID and other parameters.";
          }

          const customError = new Error(errorMessage);
          setError(customError);
          onError?.(customError);
        },
      });
    } catch (error) {
      console.error(`Error preparing ${fetchType} fetch transaction:`, error);
      const errorObj = error as Error;

      // Handle cooldown errors specifically
      if (
        errorObj.message?.includes("Please wait") &&
        errorObj.message?.includes("more minutes")
      ) {
        // This is a cooldown error - show it directly to the user
        setError(errorObj);
        onError?.(errorObj);
        return; // Don't continue with the transaction
      }

      setError(errorObj);
      onError?.(errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleFetchGameData,
    isLoading,
    error,
  };
}
