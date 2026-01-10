"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useState } from "react";
import { toast } from "sonner";

const MINI_APP_ADDED_KEY = "mini_app_added";

/**
 * Check if the mini app has already been added (stored in localStorage).
 */
export function isMiniAppAdded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MINI_APP_ADDED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark the mini app as added in localStorage.
 */
function setMiniAppAdded(added: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (added) {
      localStorage.setItem(MINI_APP_ADDED_KEY, "true");
    } else {
      localStorage.removeItem(MINI_APP_ADDED_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

interface UseAddMiniAppResult {
  addMiniApp: () => Promise<void>;
  isAdding: boolean;
  error: Error | null;
}

/**
 * Hook to handle adding the mini app to the user's Farcaster client.
 * This enables notifications and other mini app features.
 */
export function useAddMiniApp(): UseAddMiniAppResult {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addMiniApp = async () => {
    setIsAdding(true);
    setError(null);

    try {
      await sdk.actions.addMiniApp();
      // Mark as added on success
      setMiniAppAdded(true);
      toast.success("Mini app added! You'll now receive notifications.");
    } catch (err) {
      const error = err as Error;
      setError(error);

      // Handle specific error cases
      if (error.name === "RejectedByUser") {
        toast.info("Mini app add cancelled");
      } else if (error.name === "InvalidDomainManifestJson") {
        toast.error(
          "Unable to add mini app. Please ensure you're using the correct domain.",
        );
      } else {
        // If app is already added, the SDK might throw an error
        // We'll treat it as a success since the goal is achieved
        setMiniAppAdded(true);
        console.warn("Error adding mini app:", error);
        toast.info("Mini app may already be added");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return {
    addMiniApp,
    isAdding,
    error,
  };
}
