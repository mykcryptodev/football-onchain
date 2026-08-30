"use client";

import { useEffect } from "react";

import { impactOccurred } from "@/lib/haptics";

const INTERACTIVE_BUTTON_SELECTOR =
  'button:not([disabled]):not([aria-disabled="true"]), [role="button"]:not([aria-disabled="true"]), input[type="button"]:not([disabled]), input[type="submit"]:not([disabled]), input[type="reset"]:not([disabled])';

export function HapticButtonProvider() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest(INTERACTIVE_BUTTON_SELECTOR);
      if (!button || button.hasAttribute("data-haptic-handled")) return;

      void impactOccurred(
        button.getAttribute("data-haptic") === "heavy" ? "heavy" : "light",
      );
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return null;
}
