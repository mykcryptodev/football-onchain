import { COMMENT_MANAGER_ADDRESS } from "@ecp.eth/sdk";
import {
  useAddApproval,
  type UseAddApprovalResult,
  useIsApproved,
} from "@ecp.eth/sdk/comments/react";
import { useActiveAccount } from "thirdweb/react";

interface UseEthCommentsApprovalOptions {
  appSignerAddress: string;
  enabled?: boolean;
}

interface UseEthCommentsApprovalReturn {
  isApproved: boolean;
  isLoading: boolean;
  error: Error | null;
  addApproval: UseAddApprovalResult["mutateAsync"];
  isAddingApproval: boolean;
}

/**
 * Hook to manage EthComments approval flow
 * Checks if the app signer is approved and provides a method to add approval
 */
export function useEthCommentsApproval({
  appSignerAddress,
  enabled = true,
}: UseEthCommentsApprovalOptions): UseEthCommentsApprovalReturn {
  const account = useActiveAccount();
  const authorAddress = account?.address;

  // Check if app is already approved
  const {
    data: isApproved,
    isLoading,
    error,
  } = useIsApproved(
    {
      commentsAddress: COMMENT_MANAGER_ADDRESS,
      author: (authorAddress as `0x${string}`) ?? "0x",
      app: appSignerAddress as `0x${string}`,
    },
    {
      enabled: enabled && !!authorAddress,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  // Hook to add approval
  const { mutateAsync: addApproval, isPending: isAddingApproval } =
    useAddApproval();

  return {
    isApproved: isApproved ?? false,
    isLoading,
    error: error as Error | null,
    addApproval,
    isAddingApproval,
  };
}
