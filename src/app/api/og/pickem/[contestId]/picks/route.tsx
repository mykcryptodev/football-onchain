import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { loadPickemOgFonts } from "@/lib/og/pickem-card";
import { renderPickemPicksOgCard } from "@/lib/og/pickem-picks-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";
import { getSeasonTypeName, getWalletPickemEntries } from "@/lib/pickem-skill-api";

export const runtime = "edge";

const CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  const contestIdNum = parseInt(contestId);
  const wallet = request.nextUrl.searchParams.get("wallet");
  const tokenIdParam = request.nextUrl.searchParams.get("tokenId");

  if (isNaN(contestIdNum) || !wallet) {
    return new Response("Missing contest id or wallet", { status: 400 });
  }

  let weekNumber = 0;
  let seasonTypeName = "Season";
  let year = new Date().getFullYear();
  let correctPicks = 0;
  let gamesDecided = 0;
  let totalGames = 0;
  let rank: number | null = null;
  let totalEntries = 0;

  try {
    const result = await getWalletPickemEntries(contestIdNum, wallet);
    if (result?.entered) {
      const entry = tokenIdParam
        ? (result.entries.find(e => e.tokenId === Number(tokenIdParam)) ??
          result.entries[0])
        : result.entries[0];

      weekNumber = result.contest.weekNumber;
      seasonTypeName = getSeasonTypeName(result.contest.seasonType);
      year = result.contest.year;
      correctPicks = entry.correctPicks;
      gamesDecided = entry.gamesDecided;
      totalGames = entry.totalGames;
      rank = entry.rank;
      totalEntries = result.totalEntriesInContest;
    }
  } catch (error) {
    console.error("Error loading picks for OG image:", error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  return new ImageResponse(
    renderPickemPicksOgCard({
      contestId: contestIdNum,
      weekNumber,
      seasonTypeName,
      year,
      correctPicks,
      gamesDecided,
      totalGames,
      rank,
      totalEntries,
    }),
    {
      ...PICKEM_OG_SIZES.og,
      fonts: await loadPickemOgFonts(baseUrl),
      headers: { "cache-control": CACHE_CONTROL },
    },
  );
}
