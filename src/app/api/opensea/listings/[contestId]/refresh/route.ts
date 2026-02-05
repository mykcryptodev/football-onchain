import { NextRequest, NextResponse } from "next/server";

import { chain } from "@/constants";
import { getListingsCacheKey, redis, safeRedisOperation } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const resolvedParams = await params;
  const contestId = resolvedParams.contestId;

  if (!contestId) {
    return NextResponse.json(
      { error: "Contest ID is required" },
      { status: 400 },
    );
  }

  if (!redis) {
    return NextResponse.json({
      refreshed: false,
      reason: "Redis not configured",
    });
  }

  let chainId = chain.id;
  try {
    const body = await request.json();
    if (body?.chainId && typeof body.chainId === "number") {
      chainId = body.chainId;
    }
  } catch {
    /* empty */
  }

  const cacheKey = getListingsCacheKey(contestId, chainId);
  const redisClient = redis;
  await safeRedisOperation(() => redisClient.del(cacheKey), null);

  return NextResponse.json({ refreshed: true });
}
