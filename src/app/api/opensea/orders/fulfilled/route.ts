import { NextRequest, NextResponse } from "next/server";

import { chain } from "@/constants";
import {
  getCancelledOrdersKey,
  getContestCacheKey,
  getListingsCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!redis) {
    return NextResponse.json(
      { error: "Redis not configured" },
      { status: 500 },
    );
  }

  let body: { orderHash?: string; contestId?: string; chainId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const { orderHash, contestId, chainId = chain.id } = body;

  if (!orderHash || !contestId) {
    return NextResponse.json(
      { error: "orderHash and contestId are required" },
      { status: 400 },
    );
  }

  try {
    const orderHashLower = orderHash.toLowerCase();
    const cancelledOrdersKey = getCancelledOrdersKey(chainId);

    await safeRedisOperation(
      () => redis!.sadd(cancelledOrdersKey, orderHashLower),
      null,
    );

    const listingsCacheKey = getListingsCacheKey(contestId, chainId);
    await safeRedisOperation(() => redis!.del(listingsCacheKey), null);

    const contestCacheKey = getContestCacheKey(contestId, chainId);
    await safeRedisOperation(() => redis!.del(contestCacheKey), null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark order as fulfilled:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
