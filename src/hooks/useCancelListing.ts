"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useState } from "react";
import { prepareTransaction } from "thirdweb";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

import { OpenSeaListing } from "@/components/contest/types";
import { chain } from "@/constants";
import { queryKeys } from "@/lib/query-keys";
import { client } from "@/providers/Thirdweb";

export interface CancelListingParams {
  listing: OpenSeaListing;
  contestId: number;
}

interface UseCancelListingReturn {
  cancelListing: (params: CancelListingParams) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

const SEAPORT_ADDRESS = "0x0000000000000068f116a894984e2db1123eb395";

const SEAPORT_CANCEL_ABI = [
  "function cancel((address offerer, address zone, (uint8 itemType, address token, uint256 identifierOrCriteria, uint256 startAmount, uint256 endAmount)[] offer, (uint8 itemType, address token, uint256 identifierOrCriteria, uint256 startAmount, uint256 endAmount, address recipient)[] consideration, uint8 orderType, uint256 startTime, uint256 endTime, bytes32 zoneHash, uint256 salt, bytes32 conduitKey, uint256 counter)[] orders) returns (bool cancelled)",
];

export function useCancelListing(): UseCancelListingReturn {
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const { mutateAsync: sendTransaction } = useSendAndConfirmTransaction();
  const [error, setError] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: CancelListingParams) => {
      if (!account?.address) {
        throw new Error("No wallet connected");
      }

      const { listing, contestId } = params;

      const orderParams = listing.protocol_data.parameters;

      const orderComponents = [
        orderParams.offerer,
        orderParams.zone,
        orderParams.offer.map(item => [
          item.itemType,
          item.token,
          BigInt(item.identifierOrCriteria),
          BigInt(item.startAmount),
          BigInt(item.endAmount),
        ]),
        orderParams.consideration.map(item => [
          item.itemType,
          item.token,
          BigInt(item.identifierOrCriteria),
          BigInt(item.startAmount),
          BigInt(item.endAmount),
          item.recipient,
        ]),
        orderParams.orderType,
        BigInt(orderParams.startTime),
        BigInt(orderParams.endTime),
        orderParams.zoneHash,
        BigInt(orderParams.salt),
        orderParams.conduitKey,
        BigInt(orderParams.counter),
      ];

      const iface = new ethers.Interface(SEAPORT_CANCEL_ABI);
      const calldata = iface.encodeFunctionData("cancel", [
        [orderComponents],
      ]) as `0x${string}`;

      const tx = prepareTransaction({
        client,
        chain,
        to: SEAPORT_ADDRESS,
        data: calldata,
      });

      await sendTransaction(tx);

      // Notify server to mark order as cancelled in Redis
      try {
        await fetch("/api/opensea/orders/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderHash: listing.order_hash,
            contestId: contestId.toString(),
            chainId: chain.id,
          }),
        });
      } catch (error) {
        console.warn("Failed to notify server of cancellation:", error);
        // Don't throw - the optimistic update will still work
      }

      queryClient.setQueryData(
        queryKeys.boxListings(contestId.toString()),
        (
          oldData: { listings: OpenSeaListing[]; cached: boolean } | undefined,
        ) => {
          if (!oldData) return oldData;
          const filteredListings = oldData.listings.filter(
            l =>
              l.order_hash.toLowerCase() !== listing.order_hash.toLowerCase(),
          );
          return {
            ...oldData,
            listings: filteredListings,
          };
        },
      );

      // NOTE: We intentionally do NOT call invalidateListingsCache here.
      // The optimistic update above already removed the listing from the cache.
      // Calling invalidateQueries would trigger an immediate refetch, and the
      // RPC node may return stale data (isCancelled=false) due to blockchain
      // propagation delay, which would overwrite our correct optimistic update.
      // The 30-second background refetch will eventually sync the state.
    },
    onError: err => {
      const error =
        err instanceof Error ? err : new Error("Failed to cancel listing");
      setError(error);
    },
  });

  const cancelListing = async (params: CancelListingParams): Promise<void> => {
    setError(null);
    await mutation.mutateAsync(params);
  };

  const reset = () => {
    setError(null);
    mutation.reset();
  };

  return {
    cancelListing,
    isLoading: mutation.isPending,
    error: error || (mutation.error as Error | null),
    reset,
  };
}
