"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";

import { useFarcasterAutoConnect } from "@/hooks/useFarcasterAutoConnect";

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  // Auto-connect wallet and authenticate when in Farcaster mini app
  const { autoConnectError } = useFarcasterAutoConnect();

  useEffect(() => {
    // Signal to the Farcaster client that the app is ready to be displayed
    sdk.actions.ready();
  }, []);

  // Log errors for debugging (in production, you might want to show a toast or handle differently)
  useEffect(() => {
    if (autoConnectError) {
      console.error("Farcaster auto-connect error:", autoConnectError);
    }
  }, [autoConnectError]);

  // You can optionally show a loading state while auto-connecting
  // For now, we'll let the children render immediately for better UX
  return <>{children}</>;
}
