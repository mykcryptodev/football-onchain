"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useState } from "react";

type ImpactType = "light" | "medium" | "heavy" | "soft" | "rigid";
type NotificationType = "success" | "warning" | "error";

export function useHaptics() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if haptics are supported
    const checkSupport = async () => {
      try {
        const capabilities = await sdk.getCapabilities();
        const hasImpact = capabilities.includes("haptics.impactOccurred");
        const hasNotification = capabilities.includes(
          "haptics.notificationOccurred",
        );
        const hasSelection = capabilities.includes("haptics.selectionChanged");

        setIsSupported(hasImpact || hasNotification || hasSelection);
      } catch (error) {
        console.warn("Could not check haptic support:", error);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  const impactOccurred = useCallback(
    async (type: ImpactType = "medium") => {
      if (!isSupported) return;

      try {
        await sdk.haptics.impactOccurred(type);
      } catch (error) {
        console.warn("Haptic feedback failed:", error);
      }
    },
    [isSupported],
  );

  const notificationOccurred = useCallback(
    async (type: NotificationType) => {
      if (!isSupported) return;

      try {
        await sdk.haptics.notificationOccurred(type);
      } catch (error) {
        console.warn("Haptic feedback failed:", error);
      }
    },
    [isSupported],
  );

  const selectionChanged = useCallback(async () => {
    if (!isSupported) return;

    try {
      await sdk.haptics.selectionChanged();
    } catch (error) {
      console.warn("Haptic feedback failed:", error);
    }
  }, [isSupported]);

  return {
    isSupported,
    impactOccurred,
    notificationOccurred,
    selectionChanged,
  };
}
