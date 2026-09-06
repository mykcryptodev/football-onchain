"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";

import { chain, pickem } from "@/constants";
import { draftKey, parseDraft, type PickemDraft } from "@/lib/pickem-draft";

const eventName = "pickem-draft-changed";
export function usePickemDraft(contestId: number, gameIds: string[]) {
  const account = useActiveAccount();
  const key = draftKey(chain.id, pickem[chain.id], contestId, account?.address);
  const guestKey = draftKey(chain.id, pickem[chain.id], contestId);
  const ids = gameIds.join(",");
  const [state, setState] = useState<{
    key: string;
    draft: PickemDraft | null;
  } | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        let raw = localStorage.getItem(key);
        // Adopt a signed-out draft once on login; never copy another wallet's draft.
        if (!raw && key !== guestKey) {
          const guest = localStorage.getItem(guestKey);
          if (guest && !parseDraft(guest, ids.split(","))?.pending) {
            raw = guest;
            localStorage.setItem(key, guest);
            localStorage.removeItem(guestKey);
          }
        }
        setState({ key, draft: parseDraft(raw, ids.split(",")) });
        setStorageAvailable(true);
      } catch {
        setState({ key, draft: null });
        setStorageAvailable(false);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(eventName, read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(eventName, read);
    };
  }, [key, guestKey, ids]);
  const save = useCallback(
    (draft: PickemDraft | null) => {
      setState(previous => (previous?.key === key ? { key, draft } : previous));
      try {
        if (draft) localStorage.setItem(key, JSON.stringify(draft));
        else localStorage.removeItem(key);
        setStorageAvailable(true);
        window.dispatchEvent(new Event(eventName));
      } catch {
        setStorageAvailable(false);
      }
    },
    [key],
  );
  return {
    draft: state?.key === key ? state.draft : null,
    ready: state?.key === key,
    storageAvailable,
    save,
  };
}
