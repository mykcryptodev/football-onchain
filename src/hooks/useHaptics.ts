"use client";

import { useMemo } from "react";

import {
  impactOccurred,
  notificationOccurred,
  selectionChanged,
} from "@/lib/haptics";

export function useHaptics() {
  return useMemo(
    () => ({
      impactOccurred,
      notificationOccurred,
      selectionChanged,
    }),
    [],
  );
}
