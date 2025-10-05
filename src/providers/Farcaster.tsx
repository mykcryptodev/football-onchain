"use client";

import { client } from "@/providers/Thirdweb";
import { sdk } from "@farcaster/frame-sdk";
import { useCallback, useEffect, useState } from "react";
import { useConnect } from "thirdweb/react";
import { EIP1193 } from "thirdweb/wallets";

export function FarcasterProvider({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const { connect } = useConnect();

  const connectWallet = useCallback(async () => {
    try {
      await connect(async () => {
        const wallet = EIP1193.fromProvider({
          provider: sdk.wallet.ethProvider,
        });
        await wallet.connect({ client });
        return wallet;
      });
      console.log("Farcaster wallet connected successfully");
    } catch (error) {
      console.error("Error connecting Farcaster wallet:", error);
    }
  }, [connect]);

  useEffect(() => {
    // Initialize the Farcaster SDK when the component mounts
    const initializeSDK = async () => {
      try {
        // Call ready when the app is ready to be displayed
        // This will hide the Farcaster splash screen
        await sdk.actions.ready();
        console.log("Farcaster SDK initialized");

        // Check if we have a wallet available and automatically connect
        if (sdk.wallet && !isSDKLoaded) {
          setIsSDKLoaded(true);
          await connectWallet();
        }
      } catch (error) {
        console.error("Error initializing Farcaster SDK:", error);
      }
    };

    initializeSDK();
  }, [isSDKLoaded, connectWallet]);

  return <>{children}</>;
}
