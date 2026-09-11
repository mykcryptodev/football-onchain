import { NextResponse } from "next/server";

import { chain } from "@/constants";
import { contest, tokenIds, uint } from "@/lib/bankr/service";
import {
  type ContestEntrySnapshot,
  contestEntrySnapshots,
} from "@/lib/pickem-contest-entries";
import { withRedisCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Picks never change once submitted, but new entries and NFT transfers do.
const ENTRIES_TTL_SECONDS = 30;

/** Every entry in a pick'em contest: owner, picks, tiebreaker, onchain score. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  let id: bigint;
  try {
    id = uint(contestId);
  } catch {
    return NextResponse.json({ error: "Invalid contest id" }, { status: 400 });
  }
  try {
    const entries = await withRedisCache<ContestEntrySnapshot[]>(
      `pickem:entries:v1:${chain.id}:${id}`,
      async () => {
        const [c, ids] = await Promise.all([contest(id), tokenIds(id)]);
        return {
          value: await contestEntrySnapshots(c.gameIds, ids),
          ttl: ENTRIES_TTL_SECONDS,
        };
      },
    );
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error loading pick'em entries:", error, { contestId });
    return NextResponse.json(
      { error: "Failed to load entries" },
      { status: 500 },
    );
  }
}
