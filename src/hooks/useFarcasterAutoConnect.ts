"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useState } from "react";
import { useActiveWallet, useConnect } from "thirdweb/react";
import { EIP1193 } from "thirdweb/wallets";

import { chain } from "@/constants";
import { client } from "@/providers/Thirdweb";

import { useFarcasterContext } from "./useFarcasterContext";

type AutoConnectState = {
  isAutoConnecting: boolean;
  autoConnectError: string | null;
};

/**
 * Hook that automatically connects the user's wallet when running in a Farcaster mini app.
 *
 * @returns Auto-connect state including loading and error states
 */
export function useFarcasterAutoConnect(): AutoConnectState {
  const {
    isInMiniApp,
    isLoading: contextLoading,
    walletReady,
  } = useFarcasterContext();
  const { connect } = useConnect();
  const wallet = useActiveWallet();

  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [autoConnectError, setAutoConnectError] = useState<string | null>(null);
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);

  // Auto-connect wallet when in mini app
  const connectWallet = useCallback(async () => {
    try {
      setIsAutoConnecting(true);
      setAutoConnectError(null);

      await connect(async () => {
        // Create a wallet instance from the Warpcast provider
        const walletInstance = EIP1193.fromProvider({
          provider: sdk.wallet.ethProvider,
        });

        // Trigger the connection
        await walletInstance.connect({
          client,
          chain,
        });

        // Return the wallet to the app context
        return walletInstance;
      });

      setHasAttemptedConnect(true);
    } catch (error) {
      console.error("Farcaster auto-connect failed:", error);
      setAutoConnectError(
        error instanceof Error ? error.message : "Failed to connect wallet",
      );
      setHasAttemptedConnect(true);
    } finally {
      setIsAutoConnecting(false);
    }
  }, [connect]);

  // Step 1: Connect wallet when in mini app and not already connected
  useEffect(() => {
    if (contextLoading) return;
    if (!isInMiniApp) return;
    if (!walletReady) return; // Wait for wallet provider to be ready
    if (wallet) return; // Already connected
    if (hasAttemptedConnect) return; // Already tried

    void connectWallet();
  }, [
    contextLoading,
    isInMiniApp,
    walletReady,
    wallet,
    hasAttemptedConnect,
    connectWallet,
  ]);

  return {
    isAutoConnecting,
    autoConnectError,
  };
}

