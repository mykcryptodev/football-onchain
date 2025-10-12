import { useEffect, useState } from "react";
import { getContract, ZERO_ADDRESS } from "thirdweb";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { toTokens } from "thirdweb/utils";
import { erc20Abi, formatEther, isAddressEqual } from "viem";

import { chain } from "@/constants";
import { client } from "@/providers/Thirdweb";

interface UseFormattedCurrencyOptions {
  amount: bigint | string | number;
  currencyAddress: string;
}

/**
 * Hook to format currency amounts with proper decimals and symbol
 * Caches the result to prevent unnecessary re-renders
 */
export function useFormattedCurrency({
  amount,
  currencyAddress,
}: UseFormattedCurrencyOptions) {
  const [formattedValue, setFormattedValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAndFormat() {
      try {
        setIsLoading(true);
        setError(null);

        if (isAddressEqual(ZERO_ADDRESS, currencyAddress as `0x${string}`)) {
          const formatted = `${formatEther(BigInt(amount))} ETH`;
          if (isMounted) {
            setFormattedValue(formatted);
          }
          return; // Exit early for native token
        }

        // Handle ERC20 tokens - fetch metadata from the contract
        const contract = getContract({
          client,
          chain,
          address: currencyAddress as `0x${string}`,
          abi: erc20Abi,
        });

        const metadata = await getCurrencyMetadata({ contract });
        const amountFormatted = Number(
          toTokens(BigInt(amount), metadata.decimals),
        );
        const formatted = `${amountFormatted.toLocaleString()} ${metadata.symbol}`;

        if (isMounted) {
          setFormattedValue(formatted);
        }
      } catch (err) {
        console.error("Error formatting currency:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          // Fallback to basic formatting
          setFormattedValue(`${amount.toString()} tokens`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAndFormat();

    return () => {
      isMounted = false;
    };
  }, [amount, currencyAddress]);

  return { formattedValue, isLoading, error };
}
