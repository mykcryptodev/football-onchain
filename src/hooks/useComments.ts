import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

interface Cast {
  hash: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
  };
  text: string;
  timestamp: string;
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
}

interface UseCommentsReturn {
  comments: Cast[];
  nextCursor: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useComments(contestId: string): UseCommentsReturn {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.comments(contestId),
    queryFn: async () => {
      const response = await fetch(`/api/comments/${contestId}`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    staleTime: 30 * 1000, // Comments fresh for 30 seconds
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(contestId) });
  };

  return {
    comments: query.data?.casts ?? [],
    nextCursor: query.data?.next?.cursor ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error as Error | null,
    refresh,
  };
}

