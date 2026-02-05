"use client";

import { Seaport } from "@opensea/seaport-js";
import { ItemType } from "@opensea/seaport-js/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useState } from "react";
import { getContract, readContract } from "thirdweb";
import { setApprovalForAll } from "thirdweb/extensions/erc721";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";

import { boxes, chain, usdc } from "@/constants";
import { invalidateListingsCache } from "@/lib/cache-utils";
import { client } from "@/providers/Thirdweb";

export type ListingCurrency = "ETH" | "USDC";

export interface CreateListingParams {
  tokenId: number;
  price: string;
  currency: ListingCurrency;
  contestId: number;
  buyerAddress?: string;
  durationDays?: number;
}

interface UseCreateListingReturn {
  createListing: (params: CreateListingParams) => Promise<void>;
  isLoading: boolean;
  isApproving: boolean;
  error: Error | null;
  reset: () => void;
}

const SEAPORT_ADDRESS = "0x0000000000000068f116a894984e2db1123eb395";
const OPENSEA_CONDUIT_ADDRESS = "0x1E0049783F008A0085193E00003D00cd54003c71";
const OPENSEA_CONDUIT_KEY =
  "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000";
const OPENSEA_FEE_RECIPIENT = "0x0000a26b00c1F0DF003000390027140000fAa719";
const OPENSEA_FEE_BPS = 100; // 1% (100 basis points)

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

export function useCreateListing(): UseCreateListingReturn {
  const account = useActiveAccount();
  const queryClient = useQueryClient();
  const { mutateAsync: sendTransaction } = useSendAndConfirmTransaction();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const boxesContract = getContract({
    client,
    address: boxes[chain.id],
    chain,
  });

  const mutation = useMutation({
    mutationFn: async (params: CreateListingParams) => {
      if (!account?.address) {
        throw new Error("No wallet connected");
      }

      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("No wallet provider available");
      }

      const {
        tokenId,
        price,
        currency,
        contestId,
        buyerAddress,
        durationDays = 7,
      } = params;

      const isApproved = await readContract({
        contract: boxesContract,
        method:
          "function isApprovedForAll(address owner, address operator) view returns (bool)",
        params: [account.address, OPENSEA_CONDUIT_ADDRESS],
      });

      if (!isApproved) {
        setIsApproving(true);
        try {
          const approvalTx = setApprovalForAll({
            contract: boxesContract,
            operator: OPENSEA_CONDUIT_ADDRESS,
            approved: true,
          });

          await sendTransaction(approvalTx);
        } finally {
          setIsApproving(false);
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const seaport = new Seaport(signer, {
        overrides: {
          contractAddress: SEAPORT_ADDRESS,
        },
      });

      const endTime =
        Math.floor(Date.now() / 1000) + durationDays * 24 * 60 * 60;

      const isUSDC = currency === "USDC";
      const tokenAddress = isUSDC ? usdc[chain.id] : ethers.ZeroAddress;
      const decimals = isUSDC ? 6 : 18;
      const totalPrice = ethers.parseUnits(price, decimals);
      const openseaFee = (totalPrice * BigInt(OPENSEA_FEE_BPS)) / BigInt(10000);
      const sellerProceeds = totalPrice - openseaFee;

      const consideration: Array<{
        amount: string;
        recipient: string;
        token?: string;
      }> = [
        {
          amount: sellerProceeds.toString(),
          recipient: account.address,
          ...(isUSDC ? { token: tokenAddress } : {}),
        },
        {
          amount: openseaFee.toString(),
          recipient: OPENSEA_FEE_RECIPIENT,
          ...(isUSDC ? { token: tokenAddress } : {}),
        },
      ];

      const orderParams: Parameters<typeof seaport.createOrder>[0] = {
        conduitKey: OPENSEA_CONDUIT_KEY,
        offer: [
          {
            itemType: ItemType.ERC721,
            token: boxes[chain.id],
            identifier: tokenId.toString(),
          },
        ],
        consideration,
        endTime: endTime.toString(),
        zone: ethers.ZeroAddress,
        restrictedByZone: false,
      };

      const { executeAllActions } = await seaport.createOrder(orderParams);

      const signedOrder = await executeAllActions();

      const response = await fetch("/api/opensea/post-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedOrder,
          protocolAddress: SEAPORT_ADDRESS,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to post listing to OpenSea");
      }

      await invalidateListingsCache(contestId.toString(), queryClient);
    },
    onError: err => {
      const error =
        err instanceof Error ? err : new Error("Failed to create listing");
      setError(error);
    },
  });

  const createListing = async (params: CreateListingParams): Promise<void> => {
    setError(null);
    await mutation.mutateAsync(params);
  };

  const reset = () => {
    setError(null);
    mutation.reset();
  };

  return {
    createListing,
    isLoading: mutation.isPending,
    isApproving,
    error: error || (mutation.error as Error | null),
    reset,
  };
}
