import type { IndexerAPIListCommentsSchemaType } from "@ecp.eth/sdk/indexer";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base } from "thirdweb/chains";

import { queryKeys } from "@/lib/query-keys";

type EthComment = IndexerAPIListCommentsSchemaType["results"][number];

interface UseEthCommentsReturn {
  comments: EthComment[];
  nextCursor: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useEthComments(contestId: string): UseEthCommentsReturn {
  const queryClient = useQueryClient();

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const targetUri = `${baseUrl}/contest/${contestId}`;

  const query = useQuery({
    queryKey: queryKeys.comments(contestId),
    queryFn: async () => {
      try {
        const response = await fetchComments({
          apiUrl: "https://api.ethcomments.xyz",
          targetUri,
          chainId: base.id,
          limit: 25,
          sort: "desc",
        });
        return response;
      } catch (error) {
        console.error("Error fetching EthComments:", error);
        // Return empty result if no comments exist yet
        return {
          results: [],
          pagination: { limit: 25, hasNext: false, hasPrevious: false },
        };
      }
    },
    staleTime: 30 * 1000, // Comments fresh for 30 seconds
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(contestId) });
  };

  return {
    comments: query.data?.results ?? [],
    nextCursor:
      query.data?.pagination &&
      "endCursor" in query.data.pagination &&
      query.data.pagination.endCursor
        ? query.data.pagination.endCursor
        : null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}
