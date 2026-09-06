import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

import { getBaseUrl } from "@/lib/farcaster-metadata";
import { getSeasonTypeName, getWalletPickemEntries } from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

/**
 * A wallet's picks for a contest — powers "view my picks" in the Bankr
 * Pick'em skill and the /pickem/[id]/picks share page. Looks up every token
 * the wallet owns in this contest (usually one, but a wallet can hold
 * multiple entries) and returns each one's picks joined with team names,
 * plus its live rank.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId: contestIdParam } = await params;
  const contestId = Number(contestIdParam);
  if (!Number.isSafeInteger(contestId) || contestId < 0) {
    return NextResponse.json({ error: "Invalid contest id" }, { status: 400 });
  }

  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "A valid `wallet` query param is required" },
      { status: 400 },
    );
  }

  const result = await getWalletPickemEntries(contestId, wallet);
  if (!result) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const baseUrl = getBaseUrl();

  if (!result.entered) {
    return NextResponse.json({
      contestId,
      wallet,
      entered: false,
      entries: [],
      joinUrl: `${baseUrl}/pickem/${contestId}`,
    });
  }

  return NextResponse.json({
    contestId,
    wallet,
    entered: true,
    season: {
      seasonTypeName: getSeasonTypeName(result.contest.seasonType),
      year: result.contest.year,
      weekNumber: result.contest.weekNumber,
    },
    totalEntriesInContest: result.totalEntriesInContest,
    entries: result.entries,
    picksUrl: `${baseUrl}/pickem/${contestId}/picks?wallet=${wallet}`,
  });
}
