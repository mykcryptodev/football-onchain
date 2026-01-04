"use client";

import { useFarcasterContext } from "./useFarcasterContext";

interface UseIsInMiniAppResult {
  isInMiniApp: boolean;
  isLoading: boolean;
}

/**
 * Hook to detect if the app is running in a Farcaster Mini App context
 *
 * @deprecated Use `useFarcasterContext` instead for enhanced features including wallet readiness state
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
  const { isInMiniApp, isLoading } = useFarcasterContext();

  return { isInMiniApp, isLoading };
}
