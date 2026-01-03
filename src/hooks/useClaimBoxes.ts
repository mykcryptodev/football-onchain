import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  encode,
  getContract,
  prepareContractCall,
  ZERO_ADDRESS,
} from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import {
  useActiveAccount,
  useCapabilities,
  useSendAndConfirmCalls,
  useSendAndConfirmTransaction,
} from "thirdweb/react";

import { chain, contests } from "@/constants";
import { abi as contestsAbi } from "@/constants/abis/contests";
import { invalidateContestCaches } from "@/lib/cache-utils";
import { client } from "@/providers/Thirdweb";

interface ContestData {
  boxCost?: {
    amount: string;
    currency: string;
  };
}

/**
 * Hook for claiming boxes in contests.
 *
 * Automatically detects wallet capabilities using EIP-5792:
 * - If wallet supports batching: Uses atomic approval + claim transaction
 * - If wallet doesn't support batching: Uses sequential approval then claim transactions
 *
 * For ETH payments, always uses single transaction regardless of wallet capabilities.
 */
export function useClaimBoxes() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const { mutate: sendTransaction } = useSendAndConfirmTransaction();
  const { mutate: sendCalls } = useSendAndConfirmCalls();
  const { data: capabilities, isLoading: capabilitiesLoading } =
    useCapabilities();

  const contestsContract = getContract({
    client,
    address: contests[chain.id],
    abi: contestsAbi,
    chain,
  });

  const handleClaimBoxes = async (
    boxNumbers: number[],
    contestId: number,
    playerAddress?: string,
    contestData?: ContestData,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ) => {
    if (!account) {
      throw new Error("No wallet connected");
    }

    if (!boxNumbers || boxNumbers.length === 0) {
      throw new Error("No boxes selected to claim");
    }

    // Convert box numbers to actual token IDs
    // Formula: tokenId = boxNumber + (contestId * 100)
    // Each contest has 100 boxes (0-99), so contest 0: boxes 0-99, contest 1: boxes 100-199, etc.
    const tokenIds = boxNumbers.map(boxNumber => boxNumber + contestId * 100);

    try {
      setIsLoading(true);
      setError(null);

      // Use the connected account address if no player address is provided
      const player = playerAddress || account.address;

      // Calculate the total cost for the boxes
      let value = BigInt(0);
      if (contestData?.boxCost) {
        const numBoxes = tokenIds.length;
        const boxCostWei = BigInt(contestData.boxCost.amount);
        const totalCost = boxCostWei * BigInt(numBoxes);

        // Only send ETH if the currency is native ETH (address 0)
        if (contestData.boxCost.currency === ZERO_ADDRESS) {
          value = totalCost;

          // For ETH payments, use simple contract call
          const transaction = prepareContractCall({
            contract: contestsContract,
            method:
              "function claimBoxes(uint256[] tokenIds, address player) external payable",
            params: [tokenIds.map(id => BigInt(id)), player],
            value: value,
          });

          const result = sendTransaction(transaction, {
            onSuccess: async () => {
              // Invalidate both Redis and React Query caches
              await invalidateContestCaches(contestId.toString(), queryClient);
              onSuccess?.();
            },
            onError: error => {
              console.error("Error claiming boxes with ETH:", error);
              setError(error as Error);
              onError?.(error as Error);
            },
          });

          return result;
        }

        // For ERC-20 tokens, check wallet capabilities for batching support
        value = BigInt(0);

        // Create ERC-20 contract instance using thirdweb extension
        const tokenContract = getContract({
          client,
          address: contestData.boxCost.currency,
          chain,
        });

        // Only support batching if capabilities exist AND have no error message
        const supportsBatching =
          !capabilitiesLoading && capabilities && !capabilities.message;

        if (supportsBatching) {
          // Prepare approval transaction using thirdweb's ERC-20 extension
          const approvalTx = approve({
            contract: tokenContract,
            spender: contestsContract.address,
            amountWei: totalCost,
          });

          // Prepare claim transaction
          const claimTx = prepareContractCall({
            contract: contestsContract,
            method:
              "function claimBoxes(uint256[] tokenIds, address player) external payable",
            params: [tokenIds.map(id => BigInt(id)), player],
            value: BigInt(0),
          });

          const claimCall = {
            to: contestsContract.address,
            data: await encode(claimTx),
            value: BigInt(0),
            chain,
            client,
          };

          try {
            const result = sendCalls(
              {
                calls: [approvalTx, claimCall],
              },
              {
                onSuccess: async () => {
                  // Invalidate both Redis and React Query caches
                  await invalidateContestCaches(contestId.toString(), queryClient);
                  onSuccess?.();
                },
                onError: error => {
                  console.error(
                    "Error claiming boxes with batched ERC-20:",
                    error,
                  );
                  setError(error as Error);
                  onError?.(error as Error);
                },
              },
            );

            return result;
          } catch (batchError) {
            console.warn(
              "Batching failed, falling back to sequential transactions:",
              batchError,
            );
            // Fall back to sequential transactions if batching fails
            // This handles cases where capability detection might be incorrect
            const approvalTx = approve({
              contract: tokenContract,
              spender: contestsContract.address,
              amountWei: totalCost,
            });

            const approvalResult = sendTransaction(approvalTx, {
              onSuccess: () => {
                const claimTx = prepareContractCall({
                  contract: contestsContract,
                  method:
                    "function claimBoxes(uint256[] tokenIds, address player) external payable",
                  params: [tokenIds.map(id => BigInt(id)), player],
                  value: BigInt(0),
                });

                const claimResult = sendTransaction(claimTx, {
                  onSuccess: async () => {
                    // Invalidate both Redis and React Query caches
                    await invalidateContestCaches(contestId.toString(), queryClient);
                    onSuccess?.();
                  },
                  onError: error => {
                    console.error(
                      "Error claiming boxes (fallback second transaction):",
                      error,
                    );
                    setError(error as Error);
                    onError?.(error as Error);
                  },
                });

                return claimResult;
              },
              onError: error => {
                console.error(
                  "Error approving token (fallback first transaction):",
                  error,
                );
                setError(error as Error);
                onError?.(error as Error);
              },
            });

            return approvalResult;
          }
        } else {
          // First transaction: Approve the token spending
          const approvalTx = approve({
            contract: tokenContract,
            spender: contestsContract.address,
            amountWei: totalCost,
          });

          // Execute approval first
          const approvalResult = sendTransaction(approvalTx, {
            onSuccess: () => {
              // Second transaction: Claim the boxes
              const claimTx = prepareContractCall({
                contract: contestsContract,
                method:
                  "function claimBoxes(uint256[] tokenIds, address player) external payable",
                params: [tokenIds.map(id => BigInt(id)), player],
                value: BigInt(0),
              });

              // Execute claim transaction
              const claimResult = sendTransaction(claimTx, {
                onSuccess: async () => {
                  // Invalidate both Redis and React Query caches
                  await invalidateContestCaches(contestId.toString(), queryClient);
                  onSuccess?.();
                },
                onError: error => {
                  console.error(
                    "Error claiming boxes (second transaction):",
                    error,
                  );
                  setError(error as Error);
                  onError?.(error as Error);
                },
              });

              return claimResult;
            },
            onError: error => {
              console.error(
                "Error approving token (first transaction):",
                error,
              );
              setError(error as Error);
              onError?.(error as Error);
            },
          });

          return approvalResult;
        }
      }
    } catch (err) {
      console.error("Error claiming boxes:", err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleClaimBoxes,
    isLoading,
    error,
    walletCapabilities: capabilities,
    capabilitiesLoading,
    supportsBatching:
      !capabilitiesLoading && capabilities && !capabilities.message,
  };
}
