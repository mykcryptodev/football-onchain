import { NextRequest, NextResponse } from "next/server";
import { getSocialProfiles } from "thirdweb/social";

import { fetchFarcasterBioByAddress } from "@/lib/neynar";
import {
  CACHE_TTL,
  getUserBioCacheKey,
  getUserProfileCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";
import { client } from "@/providers/Thirdweb";

interface UserProfileResponse {
  fid?: number;
  farcasterUsername?: string;
  name?: string;
  avatar?: string;
  bio?: string;
  address: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const cacheKey = getUserProfileCacheKey(address);
  let cachedProfile: UserProfileResponse | null = null;

  if (redis) {
    const redisClient = redis;
    const cached = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      null,
    );

    if (cached) {
      cachedProfile =
        typeof cached === "string"
          ? (JSON.parse(cached) as UserProfileResponse)
          : (cached as UserProfileResponse);
    }
  }

  // Fetch Farcaster bio with heavy caching (always check, even if profile is cached)
  let bio: string | null = null;
  const bioCacheKey = getUserBioCacheKey(address);

  if (redis) {
    const redisClient = redis;
    const cachedBio = await safeRedisOperation(
      () => redisClient.get(bioCacheKey),
      null,
    );

    if (cachedBio) {
      bio =
        typeof cachedBio === "string" && cachedBio !== "" ? cachedBio : null;
    }
  }

  // If not cached, fetch from Neynar (works with ETH address even without FID)
  if (bio === null) {
    bio = await fetchFarcasterBioByAddress(address);

    // Cache the bio heavily (24 hours), even if null to avoid repeated API calls
    if (redis) {
      const redisClient = redis;
      await safeRedisOperation(
        () => redisClient.setex(bioCacheKey, CACHE_TTL.USER_BIO, bio || ""),
        null,
      );
    }
  }

  // If we have a cached profile, merge bio and return
  if (cachedProfile) {
    const responseBody: UserProfileResponse = {
      ...cachedProfile,
      bio: bio || cachedProfile.bio || undefined,
    };

    // Update cache with bio if it wasn't there before
    if (!cachedProfile.bio && bio) {
      if (redis) {
        const redisClient = redis;
        await safeRedisOperation(
          () =>
            redisClient.setex(
              cacheKey,
              CACHE_TTL.USER_PROFILE,
              JSON.stringify(responseBody),
            ),
          null,
        );
      }
    }

    const response = NextResponse.json(responseBody);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  try {
    const profiles = await getSocialProfiles({
      address: address as `0x${string}`,
      client,
    });

    const farcasterProfile = profiles.find(
      profile => profile.type === "farcaster",
    );
    const ensProfile = profiles.find(profile => profile.type === "ens");
    const lensProfile = profiles.find(profile => profile.type === "lens");
    const displayProfile = ensProfile || farcasterProfile || lensProfile;

    let fid: number | undefined;
    let farcasterUsername: string | undefined;
    if (farcasterProfile) {
      const profileWithFid = farcasterProfile as typeof farcasterProfile & {
        fid?: string | number;
        username?: string;
        handle?: string;
      };
      if (profileWithFid.fid !== undefined) {
        fid =
          typeof profileWithFid.fid === "string"
            ? parseInt(profileWithFid.fid, 10)
            : Number(profileWithFid.fid);
      }
      farcasterUsername =
        profileWithFid.username || profileWithFid.handle || profileWithFid.name;
    }

    const responseBody: UserProfileResponse = {
      address,
      fid,
      farcasterUsername,
      name: displayProfile?.name,
      avatar: displayProfile?.avatar,
      bio: bio || undefined,
    };

    if (redis) {
      const redisClient = redis;
      await safeRedisOperation(
        () =>
          redisClient.setex(
            cacheKey,
            CACHE_TTL.USER_PROFILE,
            JSON.stringify(responseBody),
          ),
        null,
      );
    }

    const response = NextResponse.json(responseBody);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    return response;
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 },
    );
  }
}
