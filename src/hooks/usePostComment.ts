import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PostCommentParams {
  text: string;
  parentUrl: string;
  signerUuid: string;
}

interface PostCommentResponse {
  success: boolean;
  cast: unknown;
}

export function usePostComment() {
  const queryClient = useQueryClient();

  const mutation = useMutation<PostCommentResponse, Error, PostCommentParams>({
    mutationFn: async ({ text, parentUrl, signerUuid }: PostCommentParams) => {
      const response = await fetch("/api/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          parentUrl,
          signerUuid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post comment");
      }

      const data: PostCommentResponse = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      // Extract contestId from parentUrl to invalidate the correct comments query
      const urlMatch = variables.parentUrl.match(/\/contest\/([^/?]+)/);
      if (urlMatch) {
        const contestId = urlMatch[1];
        // Invalidate comments query to refetch with new comment
        queryClient.invalidateQueries({ queryKey: ["comments", contestId] });
      }
    },
  });

  return {
    postComment: mutation.mutateAsync,
    isPosting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
