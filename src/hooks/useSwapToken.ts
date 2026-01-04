"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useState } from "react";
import { ZERO_ADDRESS } from "thirdweb";

import { chain } from "@/constants";
import { toCaip19 } from "@/lib/utils";
import { useFarcasterContext } from "./useFarcasterContext";

type SwapTokenResult = {
  success: boolean;
  transactions?: string[];
  error?: string;
  reason?: string;
};

type TokenInfo = {
  address: string;
  symbol: string;
  chainId: number;
};

type UseSwapTokenResult = {
  swap: () => Promise<void>;
  isSwapping: boolean;
  swapResult: SwapTokenResult | null;
  swapError: string | null;
  isInMiniApp: boolean;
  isModalOpen: boolean;
  closeModal: () => void;
};

/**
 * Hook to enable token swapping via Farcaster mini app SDK or thirdweb Bridge.
 * Converts token info to CAIP-19 format and opens the native swap modal for mini apps.
 * For non-mini app users, opens a modal with thirdweb BridgeWidget.
 */
export function useSwapToken(tokenInfo: TokenInfo | null): UseSwapTokenResult {
  const { isInMiniApp } = useFarcasterContext();
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapTokenResult | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const swap = async () => {
    if (!tokenInfo) {
      setSwapError("Token information not available");
      return;
    }

    // For non-mini-app users, open the modal with thirdweb swap widget
    if (!isInMiniApp) {
      setIsModalOpen(true);
      return;
    }

    setIsSwapping(true);
    setSwapError(null);
    setSwapResult(null);

    try {
      // Convert token to CAIP-19 format
      // Native ETH: eip155:{chainId}/slip44 (for native tokens)
      // ERC20: eip155:{chainId}/erc20:{address}
      const isNative =
        tokenInfo.address.toLowerCase() === ZERO_ADDRESS.toLowerCase();
      
      const buyToken = isNative
        ? `eip155:${chain.id}/slip44:60` // ETH uses slip44 namespace with coin type 60
        : toCaip19({
            address: tokenInfo.address,
            chain,
            namespace: "erc20",
          });

      // Call the Farcaster SDK swap action
      const result = await sdk.actions.swapToken({
        buyToken,
      });

      if (result.success) {
        setSwapResult({
          success: true,
          transactions: result.swap.transactions,
        });
      } else {
        setSwapResult({
          success: false,
          error: result.error?.error,
          reason: result.reason,
        });

        // Set user-friendly error messages
        if (result.reason === "rejected_by_user") {
          setSwapError("Swap cancelled");
        } else if (result.reason === "swap_failed") {
          setSwapError(result.error?.message || "Swap failed");
        } else {
          setSwapError("Unable to complete swap");
        }
      }
    } catch (error) {
      console.error("Swap error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSwapError(errorMessage);
      setSwapResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return {
    swap,
    isSwapping,
    swapResult,
    swapError,
    isInMiniApp,
    isModalOpen,
    closeModal,
  };
}

