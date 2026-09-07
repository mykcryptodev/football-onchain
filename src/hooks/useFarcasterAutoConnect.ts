"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useState } from "react";
import { useActiveWallet, useConnect } from "thirdweb/react";
import { EIP1193 } from "thirdweb/wallets";

import { client } from "@/providers/Thirdweb";

import { useFarcasterContext } from "./useFarcasterContext";

type AutoConnectState = {
  isAutoConnecting: boolean;
  autoConnectError: string | null;
};

// The Farcaster wallet provider doesn't reliably respond to (or reject) a
// wallet_switchEthereumChain request, so a connect attempt that waits on it
// can hang forever and leave the Login button spinning. Bound the whole
// attempt so it always settles.
const CONNECT_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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

        // Trigger the connection. Deliberately omit `chain` here: asking the
        // Farcaster wallet to switch networks as part of connecting can hang
        // forever instead of resolving or rejecting, which otherwise leaves
        // the Login button stuck in its connecting state indefinitely.
        await withTimeout(
          walletInstance.connect({ client }),
          CONNECT_TIMEOUT_MS,
          "Timed out connecting to the Farcaster wallet",
        );

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

