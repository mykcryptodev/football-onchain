"use client";

import { getSocialProfiles } from "thirdweb/social";
import { useEffect, useState } from "react";

import { client } from "@/providers/Thirdweb";

interface UserProfile {
  fid?: number;
  name?: string;
  avatar?: string;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const profiles = await getSocialProfiles({
          address: address as `0x${string}`,
          client,
        });

        // Find Farcaster profile to get FID
        const farcasterProfile = profiles.find(p => p.type === "farcaster");

        // Also check for other profile types for display
        const ensProfile = profiles.find(p => p.type === "ens");
        const lensProfile = profiles.find(p => p.type === "lens");
        const displayProfile = ensProfile || farcasterProfile || lensProfile;

        // Try to extract FID from farcaster profile
        // The FID might be in different properties depending on thirdweb version
        let fid: number | undefined;
        if (farcasterProfile) {
          // Try accessing fid property (may need type assertion)
          const profileWithFid = farcasterProfile as typeof farcasterProfile & {
            fid?: string | number;
          };
          if (profileWithFid.fid !== undefined) {
            fid =
              typeof profileWithFid.fid === "string"
                ? parseInt(profileWithFid.fid, 10)
                : Number(profileWithFid.fid);
          }
        }

        if (isMounted) {
          setProfile({
            address,
            fid,
            name: displayProfile?.name,
            avatar: displayProfile?.avatar,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch profile"),
          );
          setProfile({ address }); // Still set address even if profile fetch fails
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [address]);

  return { profile, isLoading, error };
}
