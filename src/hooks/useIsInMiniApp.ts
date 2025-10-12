"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

interface UseIsInMiniAppResult {
  isInMiniApp: boolean;
  isLoading: boolean;
}

/**
 * Hook to detect if the app is running in a Farcaster Mini App context
 *
 * @returns Object containing isInMiniApp boolean and isLoading state
 *
 * @example
 * ```tsx
 * const { isInMiniApp, isLoading } = useIsInMiniApp();
 *
 * if (isLoading) return <div>Loading...</div>;
 *
 * if (isInMiniApp) {
 *   // Mini App-specific code
 * } else {
 *   // Regular web app code
 * }
 * ```
 */
export function useIsInMiniApp(): UseIsInMiniAppResult {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkMiniAppContext = async () => {
      try {
        const result = await sdk.isInMiniApp();

        if (isMounted) {
          setIsInMiniApp(result);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking Mini App context:", error);

        if (isMounted) {
          setIsInMiniApp(false);
          setIsLoading(false);
        }
      }
    };

    checkMiniAppContext();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isInMiniApp, isLoading };
}
