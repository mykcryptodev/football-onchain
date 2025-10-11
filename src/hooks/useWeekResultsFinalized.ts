"use client";

import { useEffect, useState } from "react";

import { usePickemContract } from "./usePickemContract";

interface UseWeekResultsFinalizedParams {
  year: number;
  seasonType: number;
  weekNumber: number;
  contestId: number;
  enabled?: boolean; // Allow disabling the hook
  refreshInterval?: number; // Optional auto-refresh interval in ms
}

/**
 * Hook to check if week results are finalized in the oracle contract
 * @param params Contest parameters
 * @returns Object with isFinalized status, isLoading state, and refresh function
 */
export function useWeekResultsFinalized({
  year,
  seasonType,
  weekNumber,
  contestId,
  enabled = true,
  refreshInterval,
}: UseWeekResultsFinalizedParams) {
  const { isWeekResultsFinalized } = usePickemContract();
  const [isFinalized, setIsFinalized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkFinalized = async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const finalized = await isWeekResultsFinalized({
        year,
        seasonType,
        weekNumber,
      });
      setIsFinalized(finalized);
    } catch (error) {
      console.error("Error checking week results finalized:", error);
      setIsFinalized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial check
  useEffect(() => {
    checkFinalized();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, seasonType, weekNumber, enabled]);

  // Optional auto-refresh interval
  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(() => {
      checkFinalized();
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, seasonType, weekNumber, enabled, refreshInterval]);

  return {
    isFinalized,
    isLoading,
    refresh: checkFinalized,
    contestId,
  };
}

/**
 * Hook to check multiple contests' week results finalization status
 * @param contests Array of contest parameters
 * @returns Map of contestId to finalized status and refresh function
 */
export function useMultipleWeekResultsFinalized(
  contests: Array<{
    year: number;
    seasonType: number;
    weekNumber: number;
    contestId: number;
    enabled?: boolean;
  }>,
) {
  const { isWeekResultsFinalized } = usePickemContract();
  const [statusMap, setStatusMap] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAllFinalized = async () => {
    try {
      setIsLoading(true);
      const results: Record<number, boolean> = {};

      // Check all contests in parallel
      await Promise.all(
        contests.map(async contest => {
          if (contest.enabled === false) {
            results[contest.contestId] = false;
            return;
          }

          try {
            const finalized = await isWeekResultsFinalized({
              year: contest.year,
              seasonType: contest.seasonType,
              weekNumber: contest.weekNumber,
            });
            results[contest.contestId] = finalized;
          } catch (error) {
            console.error(
              `Error checking contest ${contest.contestId}:`,
              error,
            );
            results[contest.contestId] = false;
          }
        }),
      );

      setStatusMap(results);
    } catch (error) {
      console.error("Error checking multiple week results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial check when contests change
  useEffect(() => {
    if (contests.length > 0) {
      checkAllFinalized();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(
      contests.map(
        c => `${c.contestId}-${c.year}-${c.seasonType}-${c.weekNumber}`,
      ),
    ),
  ]);

  return {
    statusMap,
    isLoading,
    refresh: checkAllFinalized,
  };
}
