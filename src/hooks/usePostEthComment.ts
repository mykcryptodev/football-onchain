import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base } from "thirdweb/chains";
import { sendTransaction, getContract } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { COMMENT_MANAGER_ADDRESS } from "@ecp.eth/sdk";

import { client } from "@/providers/Thirdweb";
import { postComment } from "@/constants/abis/comments";

interface PostEthCommentParams {
  content: string;
  targetUri: string;
}

interface PostEthCommentResult {
  txHash: string;
}

export function usePostEthComment() {
  const queryClient = useQueryClient();
  const account = useActiveAccount();

  const mutation = useMutation<
    PostEthCommentResult,
    Error,
    PostEthCommentParams
  >({
    mutationFn: async ({ content, targetUri }: PostEthCommentParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      // Get contract instance
      const contract = getContract({
        address: COMMENT_MANAGER_ADDRESS,
        chain: base,
        client,
      });

      // Prepare the comment data struct
      // Order must match the CreateComment struct exactly:
      // author, app, channelId, deadline, parentId, commentType, content, metadata[], targetUri
      const commentData = {
        author: account.address as `0x${string}`,
        app: account.address as `0x${string}`, // Using wallet as app for direct posting
        channelId: BigInt(0), // Default channel
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
        parentId:
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        commentType: 0, // 0 = comment
        content,
        metadata: [], // No metadata
        targetUri,
      };

      // Use the generated postComment function
      const transaction = postComment({
        contract,
        commentData,
        appSignature: "0x" as `0x${string}`, // Empty signature for direct posting
      });

      const { transactionHash } = await sendTransaction({
        transaction,
        account,
      });

      return { txHash: transactionHash };
    },
    onSuccess: (_, variables) => {
      // Extract contestId from targetUri to invalidate the correct comments query
      const urlMatch = variables.targetUri.match(/\/contest\/([^/?]+)/);
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
