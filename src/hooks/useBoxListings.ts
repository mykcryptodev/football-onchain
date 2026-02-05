"use client";

import { useQuery } from "@tanstack/react-query";

import { OpenSeaListing } from "@/components/contest/types";
import { queryKeys } from "@/lib/query-keys";

interface ListingsResponse {
  listings: OpenSeaListing[];
  cached: boolean;
}

interface UseBoxListingsReturn {
  listings: Map<number, OpenSeaListing>;
  listingsArray: OpenSeaListing[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function getTokenIdFromListing(listing: OpenSeaListing): number | null {
  const offer = listing.protocol_data?.parameters?.offer?.[0];
  if (!offer) return null;
  return parseInt(offer.identifierOrCriteria, 10);
}

export function useBoxListings(
  contestId: string | number,
): UseBoxListingsReturn {
  const contestIdStr = String(contestId);

  const query = useQuery({
    queryKey: queryKeys.boxListings(contestIdStr),
    queryFn: async (): Promise<ListingsResponse> => {
      const response = await fetch(`/api/opensea/listings/${contestIdStr}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      return response.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const listingsArray = query.data?.listings ?? [];
  const listingsMap = new Map<number, OpenSeaListing>();

  for (const listing of listingsArray) {
    const tokenId = getTokenIdFromListing(listing);
    if (tokenId !== null) {
      listingsMap.set(tokenId, listing);
    }
  }

  return {
    listings: listingsMap,
    listingsArray,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
