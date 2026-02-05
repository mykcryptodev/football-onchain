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
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"useBoxListings.ts:36",message:"queryFn executing fetch",data:{ contestId:contestIdStr },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"A" }) }).catch(()=>{});
      // #endregion
      const response = await fetch(`/api/opensea/listings/${contestIdStr}`);
      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }
      const data = await response.json();
      // #region agent log
      fetch("http://127.0.0.1:7245/ingest/456ee47a-dde0-48bf-94fa-c3805bcf5e6b",{ method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ location:"useBoxListings.ts:44",message:"queryFn received data",data:{ contestId:contestIdStr,listingCount:data.listings?.length,cached:data.cached,orderHashes:data.listings?.map((l:OpenSeaListing)=>l.order_hash) },timestamp:Date.now(),sessionId:"debug-session",hypothesisId:"A" }) }).catch(()=>{});
      // #endregion
      return data;
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
