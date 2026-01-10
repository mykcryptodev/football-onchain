"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useQuery } from "@tanstack/react-query";

type FarcasterContextState = {
  context: Awaited<typeof sdk.context> | null;
  isInMiniApp: boolean;
  isLoading: boolean;
  walletReady: boolean;
};

/**
 * Hook to detect if the app is running in a Farcaster mini app
 * and retrieve the Farcaster context (user info, etc).
 *
 * Uses the official sdk.isInMiniApp() function for reliable detection
 * that handles SSR, iframe, and ReactNative WebView environments.
 */
export function useFarcasterContext(): FarcasterContextState {
  const { data, isLoading } = useQuery({
    queryKey: ["farcaster", "context"],
    queryFn: async () => {
      // Use official SDK detection function
      const isInMiniApp = await sdk.isInMiniApp();

      if (!isInMiniApp) {
        return {
          context: null,
          isInMiniApp: false,
          walletReady: false,
        };
      }

      // If in mini app, get the full context
      const context = await sdk.context;

      // Check if wallet provider is available
      const walletReady = !!sdk.wallet?.ethProvider;

      return {
        context,
        isInMiniApp: true,
        walletReady,
      };
    },
    staleTime: Number.POSITIVE_INFINITY, // Only check once per session
    retry: false, // Don't retry on failure
  });

  return {
    context: data?.context ?? null,
    isInMiniApp: data?.isInMiniApp ?? false,
    isLoading,
    walletReady: data?.walletReady ?? false,
  };
}
