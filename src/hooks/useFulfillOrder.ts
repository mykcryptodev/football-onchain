"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useState } from "react";
import {
  getContract,
  prepareTransaction,
  readContract,
  ZERO_ADDRESS,
} from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

import type { OpenSeaListing } from "@/components/contest/types";
import { chain, usdc } from "@/constants";
import {
  invalidateContestCaches,
  invalidateListingsCache,
} from "@/lib/cache-utils";
import { client } from "@/providers/Thirdweb";

export interface FulfillOrderParams {
  listing: OpenSeaListing;
  contestId: number;
}

interface UseFulfillOrderReturn {
  fulfillOrder: (params: FulfillOrderParams) => Promise<void>;
  isLoading: boolean;
  isApproving: boolean;
  error: Error | null;
  reset: () => void;
}

const OPENSEA_CONDUIT_ADDRESS = "0x1E0049783F008A0085193E00003D00cd54003c71";

export function useFulfillOrder(): UseFulfillOrderReturn {
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const { mutateAsync: sendTransaction } = useSendAndConfirmTransaction();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: FulfillOrderParams) => {
      if (!account?.address) {
        throw new Error("No wallet connected");
      }

      const { listing, contestId } = params;

      const paymentToken = listing.price.current.currency;
      const isERC20Payment =
        paymentToken.toLowerCase() !== "eth" &&
        paymentToken.toLowerCase() !== ZERO_ADDRESS.toLowerCase();

      if (isERC20Payment) {
        const priceWei = BigInt(listing.price.current.value);

        const tokenContract = getContract({
          client,
          address: usdc[chain.id],
          chain,
        });

        const allowance = await readContract({
          contract: tokenContract,
          method:
            "function allowance(address owner, address spender) view returns (uint256)",
          params: [account.address, OPENSEA_CONDUIT_ADDRESS],
        });

        if (allowance < priceWei) {
          setIsApproving(true);
          try {
            const approvalTx = approve({
              contract: tokenContract,
              spender: OPENSEA_CONDUIT_ADDRESS,
              amountWei: priceWei,
            });

            await sendTransaction(approvalTx);
          } finally {
            setIsApproving(false);
          }
        }
      }

      const fulfillResponse = await fetch("/api/opensea/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing,
          fulfillerAddress: account.address,
        }),
      });

      if (!fulfillResponse.ok) {
        const errorData = await fulfillResponse.json();
        throw new Error(
          errorData.error || "Failed to get fulfillment data from OpenSea",
        );
      }

      const fulfillmentData = await fulfillResponse.json();

      const txData = fulfillmentData.fulfillment_data.transaction;

      let calldata: `0x${string}`;

      if (typeof txData.input_data === "string") {
        calldata = txData.input_data as `0x${string}`;
      } else if (txData.input_data?.parameters) {
        const params = txData.input_data.parameters;
        const iface = new ethers.Interface([`function ${txData.function}`]);
        const functionName = txData.function.split("(")[0];

        const orderTuple = [
          params.considerationToken,
          BigInt(params.considerationIdentifier),
          BigInt(params.considerationAmount),
          params.offerer,
          params.zone,
          params.offerToken,
          BigInt(params.offerIdentifier),
          BigInt(params.offerAmount),
          params.basicOrderType,
          BigInt(params.startTime),
          BigInt(params.endTime),
          params.zoneHash,
          BigInt(params.salt),
          params.offererConduitKey,
          params.fulfillerConduitKey,
          BigInt(params.totalOriginalAdditionalRecipients),
          params.additionalRecipients.map(
            (r: { amount: string; recipient: string }) => [
              BigInt(r.amount),
              r.recipient,
            ],
          ),
          params.signature,
        ];

        calldata = iface.encodeFunctionData(functionName, [
          orderTuple,
        ]) as `0x${string}`;
      } else {
        console.error("OpenSea fulfillment tx data:", txData);
        throw new Error("Invalid transaction data from OpenSea");
      }

      const tx = prepareTransaction({
        client,
        chain,
        to: txData.to,
        data: calldata,
        value: BigInt(txData.value || "0"),
      });

      await sendTransaction(tx);

      await invalidateListingsCache(contestId.toString(), queryClient);
      await invalidateContestCaches(contestId.toString(), queryClient);
    },
    onError: err => {
      const error =
        err instanceof Error ? err : new Error("Failed to fulfill order");
      setError(error);
    },
  });

  const fulfillOrder = async (params: FulfillOrderParams): Promise<void> => {
    setError(null);
    await mutation.mutateAsync(params);
  };

  const reset = () => {
    setError(null);
    mutation.reset();
  };

  return {
    fulfillOrder,
    isLoading: mutation.isPending,
    isApproving,
    error: error || (mutation.error as Error | null),
    reset,
  };
}
