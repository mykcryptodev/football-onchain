/**
 * Cached leaderboard for one Pick'em contest.
 *
 * The board is identical for every viewer, so it is assembled once here and
 * shared from Redis rather than re-read from the chain by each browser. A
 * `DELETE` busts the key — the entry flow calls it after a submission so a
 * fresh entrant is never missing from their own board for a TTL window.
 */
import { NextRequest, NextResponse } from "next/server";

import { buildLeaderboard, type LeaderboardDto } from "@/lib/pickem-leaderboard";
import {
  getPickemLeaderboardCacheKey,
  pickemLeaderboardTtl,
  redis,
  safeRedisOperation,
} from "@/lib/redis";

export const dynamic = "force-dynamic";

function parseContestId(raw: string): bigint | null {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  const id = parseContestId(contestId);
  if (id === null)
    return NextResponse.json({ error: "Invalid contest ID" }, { status: 400 });

  const cacheKey = getPickemLeaderboardCacheKey(contestId);

  if (redis) {
    const client = redis;
    const cached = await safeRedisOperation(() => client.get(cacheKey), null);
    if (cached) {
      const body = (
        typeof cached === "string" ? JSON.parse(cached) : cached
      ) as LeaderboardDto;
      return NextResponse.json(body, { headers: { "x-cache": "HIT" } });
    }
  }

  let board: LeaderboardDto;
  try {
    board = await buildLeaderboard(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notFound = message === "Contest not found.";
    return NextResponse.json(
      { error: message },
      { status: notFound ? 404 : 502 },
    );
  }

  if (redis) {
    const client = redis;
    const ttl = pickemLeaderboardTtl(
      board.settled,
      board.gamesCompleted === board.totalGames,
    );
    await safeRedisOperation(
      () => client.setex(cacheKey, ttl, JSON.stringify(board)),
      null,
    );
  }

  return NextResponse.json(board, { headers: { "x-cache": "MISS" } });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  if (parseContestId(contestId) === null)
    return NextResponse.json({ error: "Invalid contest ID" }, { status: 400 });
  if (!redis) return NextResponse.json({ cleared: false, reason: "no redis" });

  const client = redis;
  await safeRedisOperation(
    () => client.del(getPickemLeaderboardCacheKey(contestId)),
    null,
  );
  return NextResponse.json({ cleared: true });
}
