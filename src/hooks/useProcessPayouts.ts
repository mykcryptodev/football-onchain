import { chain, contests } from "@/constants";
import { abi as contestsAbi } from "@/constants/abis/contests";
import { client } from "@/providers/Thirdweb";
import { useState } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

/**
 * Hook for processing payouts in contests.
 *
 * This hook handles calling the processPayouts function on the contest contract,
 * which calculates and distributes rewards to winners based on the contest's payout strategy.
 */
export function useProcessPayouts() {
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

  const handleProcessPayouts = async (
    contestId: number,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
  ) => {
    if (!account) {
      const error = new Error("No wallet connected");
      setError(error);
      onError?.(error);
      throw error;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Prepare the processPayouts transaction
      const transaction = prepareContractCall({
        contract: contestsContract,
        method: "function processPayouts(uint256 contestId) external",
        params: [BigInt(contestId)],
      });

      // Execute the transaction
      const result = sendTransaction(transaction, {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: error => {
          console.error(
            `Error processing payouts for contest ${contestId}:`,
            error,
          );
          setError(error as Error);
          onError?.(error as Error);
        },
      });

      return result;
    } catch (err) {
      console.error("Error processing payouts:", err);
      const error = err as Error;
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleProcessPayouts,
    isLoading,
    error,
  };
}
