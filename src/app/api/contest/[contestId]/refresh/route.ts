import { getContestCacheKey, redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { contestId: string } },
) {
  try {
    const { contestId } = params;

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 },
      );
    }

    // Get chain ID from request body or default to Base mainnet
    const body = await request.json().catch(() => ({}));
    const chainId = body.chainId || 8453;

    if (redis) {
      const cacheKey = getContestCacheKey(contestId, chainId);
      const deleted = await redis.del(cacheKey);

      console.log(
        `Cache invalidated for contest ${contestId} on chain ${chainId}:`,
        deleted > 0 ? "success" : "not found",
      );

      const response = NextResponse.json({
        success: true,
        message: `Cache invalidated for contest ${contestId}`,
        cacheKey,
        deleted: deleted > 0,
      });

      // Disable Next.js caching
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      response.headers.set("Surrogate-Control", "no-store");

      return response;
    } else {
      console.log("Redis not configured, cache invalidation skipped");
      const response = NextResponse.json({
        success: true,
        message: "Redis not configured, cache invalidation skipped",
      });

      // Disable Next.js caching
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      response.headers.set("Surrogate-Control", "no-store");

      return response;
    }
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return NextResponse.json(
      { error: "Failed to invalidate cache" },
      { status: 500 },
    );
  }
}
