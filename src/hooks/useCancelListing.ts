"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useState } from "react";
import { prepareTransaction } from "thirdweb";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

import { OpenSeaListing } from "@/components/contest/types";
import { chain } from "@/constants";
import { invalidateListingsCache } from "@/lib/cache-utils";
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
        0,
        BigInt(orderParams.startTime),
        BigInt(orderParams.endTime),
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        BigInt(orderParams.startTime),
        "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000",
        BigInt(0),
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

      queryClient.setQueryData(
        queryKeys.boxListings(contestId.toString()),
        (
          oldData: { listings: OpenSeaListing[]; cached: boolean } | undefined,
        ) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            listings: oldData.listings.filter(
              l =>
                l.order_hash.toLowerCase() !== listing.order_hash.toLowerCase(),
            ),
          };
        },
      );

      await invalidateListingsCache(contestId.toString(), queryClient);
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
