import { NextResponse } from "next/server";
import { getSocialProfiles } from "thirdweb/social";

import {
  CACHE_TTL,
  getUserProfileCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";
import { client } from "@/providers/Thirdweb";

interface UserProfileResponse {
  fid?: number;
  name?: string;
  avatar?: string;
  address: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const cacheKey = getUserProfileCacheKey(address);

  if (redis) {
    const cachedProfile = await safeRedisOperation(
      () => redis.get(cacheKey),
      null,
    );

    if (cachedProfile) {
      const parsedProfile =
        typeof cachedProfile === "string"
          ? (JSON.parse(cachedProfile) as UserProfileResponse)
          : (cachedProfile as UserProfileResponse);
      const response = NextResponse.json(parsedProfile);
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      return response;
    }
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
    if (farcasterProfile) {
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

    const responseBody: UserProfileResponse = {
      address,
      fid,
      name: displayProfile?.name,
      avatar: displayProfile?.avatar,
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
