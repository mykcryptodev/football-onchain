import { chain, contests, randomNumbers } from "@/constants";
import { abi as contestsAbi } from "@/constants/abis/contests";
import { abi as randomNumbersAbi } from "@/constants/abis/randomNumbers";
import { estimateRequestPrice } from "@/constants/contracts/randomNumbers";
import { client } from "@/providers/Thirdweb";
import { useState } from "react";
import { getContract, prepareContractCall } from "thirdweb";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

export function useRandomNumbers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  const contestsContract = getContract({
    client,
    address: contests[chain.id],
    abi: contestsAbi,
    chain,
  });
  const randomNumbersContract = getContract({
    client,
    address: randomNumbers[chain.id],
    abi: randomNumbersAbi,
    chain,
  });

  const handleRequestRandomNumbers = async (contestId: number) => {
    if (!account) {
      throw new Error("No wallet connected");
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get the current request price for the random number request
      const requestPrice = await estimateRequestPrice({
        contract: randomNumbersContract,
      });

      // pad the request price by 1000x - excess will be refunded and 1000x is still very cheap
      const paddedRequestPrice = requestPrice * BigInt(1000);

      const transaction = prepareContractCall({
        contract: contestsContract,
        method:
          "function fetchRandomValues(uint256 contestId) external payable",
        params: [BigInt(contestId)],
        value: paddedRequestPrice,
      });

      const result = sendTransaction(transaction, {
        onError: error => {
          console.error("Error requesting random numbers:", error);
        },
      });

      return result;
    } catch (err) {
      console.error("Error requesting random numbers:", err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleRequestRandomNumbers,
    isLoading,
    error,
  };
}
