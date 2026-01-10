import { COMMENT_MANAGER_ADDRESS } from "@ecp.eth/sdk";
import { createCommentData } from "@ecp.eth/sdk/comments";
import { getOneMinuteFromNowInSeconds } from "@ecp.eth/sdk/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveAccount } from "thirdweb/react";

import { client } from "@/providers/Thirdweb";

interface PostEthCommentParams {
  content: string;
  targetUri: string;
  appSignerAddress: string;
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
    mutationFn: async ({
      content,
      targetUri,
      appSignerAddress,
    }: PostEthCommentParams) => {
      if (!account?.address) {
        throw new Error("Wallet not connected");
      }

      // Create comment data
      const commentData = createCommentData({
        content,
        targetUri,
        author: account.address as `0x${string}`,
        app: appSignerAddress as `0x${string}`,
        deadline: getOneMinuteFromNowInSeconds(),
      });

      // For now, we'll use the direct transaction method (no signature)
      // This requires the user to sign the transaction directly
      const transaction = prepareContractCall({
        contract: {
          address: COMMENT_MANAGER_ADDRESS,
          chain: base,
          client,
        },
        method:
          "function postComment((string content, string targetUri, uint8 commentType, uint256 channelId, bytes32 parentId, address author, address app, uint256 deadline) commentData, bytes memory appSignature)",
        params: [commentData, "0x"],
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
