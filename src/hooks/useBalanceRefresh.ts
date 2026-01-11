"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseBalanceRefreshOptions = {
  refetch?: () => Promise<unknown>;
  durationMs?: number;
  intervalMs?: number;
};

type UseBalanceRefreshResult = {
  start: () => void;
  stop: () => void;
  isRefreshing: boolean;
};

const DEFAULT_DURATION_MS = 300_000;
const DEFAULT_INTERVAL_MS = 15_000;

export function useBalanceRefresh({
  refetch,
  durationMs = DEFAULT_DURATION_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseBalanceRefreshOptions): UseBalanceRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsRefreshing(false);
  }, []);

  const start = useCallback(() => {
    if (!refetch || intervalRef.current) {
      return;
    }
    setIsRefreshing(true);
    void refetch();
    intervalRef.current = setInterval(() => {
      void refetch();
    }, intervalMs);
    timeoutRef.current = setTimeout(() => {
      stop();
    }, durationMs);
  }, [durationMs, intervalMs, refetch, stop]);

  useEffect(() => stop, [stop]);

  return { start, stop, isRefreshing };
}
