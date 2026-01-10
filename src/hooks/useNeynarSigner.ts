import { useQuery } from "@tanstack/react-query";

interface SignerResponse {
  status: "approved" | "pending_approval";
  signerUuid?: string;
  approvalUrl?: string;
}

interface UseNeynarSignerOptions {
  fid: number | null;
  enabled?: boolean;
}

export function useNeynarSigner({ fid, enabled = true }: UseNeynarSignerOptions) {
  const query = useQuery({
    queryKey: ["neynar-signer", fid],
    queryFn: async () => {
      if (!fid) {
        throw new Error("FID is required");
      }

      const response = await fetch(`/api/signer?fid=${fid}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch signer");
      }

      const data: SignerResponse = await response.json();
      return data;
    },
    enabled: enabled && fid !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    signerStatus: query.data?.status ?? null,
    signerUuid: query.data?.signerUuid ?? null,
    approvalUrl: query.data?.approvalUrl ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
