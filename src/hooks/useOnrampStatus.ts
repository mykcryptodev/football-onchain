"use client";

import { useQuery } from "@tanstack/react-query";

import type { OnrampStatusResponse } from "@/lib/onramp/types";

const DISABLED: OnrampStatusResponse = { enabled: false, sandbox: false };

/** Whether the server can create Apple Pay / Google Pay onramp orders. */
export function useOnrampStatus() {
  const query = useQuery({
    queryKey: ["onramp", "status"],
    queryFn: async (): Promise<OnrampStatusResponse> => {
      const response = await fetch("/api/onramp/status");
      if (!response.ok) return DISABLED;
      return (await response.json()) as OnrampStatusResponse;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    enabled: query.data?.enabled ?? false,
    sandbox: query.data?.sandbox ?? false,
    isLoading: query.isLoading,
  };
}
