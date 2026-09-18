"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isSavedContactValid,
  savedContactKey,
  type SavedOnrampContact,
} from "@/lib/onramp/helpers";

/**
 * Verified onramp contact details for a wallet, persisted in localStorage so
 * returning users skip the OTP steps until Coinbase's 60-day expiry.
 */
export function useOnrampContact(address: string | undefined) {
  const [contact, setContact] = useState<SavedOnrampContact | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!address || typeof window === "undefined") {
      setContact(null);
      setReady(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(savedContactKey(address));
      const parsed = raw ? (JSON.parse(raw) as SavedOnrampContact) : null;
      setContact(isSavedContactValid(parsed, Date.now()) ? parsed : null);
    } catch {
      setContact(null);
    }
    setReady(true);
  }, [address]);

  const save = useCallback(
    (next: SavedOnrampContact) => {
      setContact(next);
      if (!address || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          savedContactKey(address),
          JSON.stringify(next),
        );
      } catch {
        // Storage may be unavailable (private mode); the session still works.
      }
    },
    [address],
  );

  const clear = useCallback(() => {
    setContact(null);
    if (!address || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(savedContactKey(address));
    } catch {
      // ignore
    }
  }, [address]);

  return { contact, ready, save, clear };
}
