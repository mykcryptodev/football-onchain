"use client";

import { useQuery } from "@tanstack/react-query";

interface UserProfile {
  fid?: number;
  name?: string;
  avatar?: string;
  farcasterBio?: string;
  address: string;
}

interface UseUserProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch user profile (including FID) from a wallet address
 */
export function useUserProfile(address: string | null): UseUserProfileResult {
  const query = useQuery<UserProfile, Error>({
    queryKey: ["userProfile", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const response = await fetch(`/api/user-profile/${address}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      return (await response.json()) as UserProfile;
    },
    staleTime: 5 * 60 * 1000,
  });

  const profile =
    query.data ?? (query.isError && address ? { address } : null);
  const error = query.error ?? null;

  return { profile, isLoading: query.isLoading, error };
}
