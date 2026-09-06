import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import {
  contest,
  entries,
  matchups,
  tokenIds,
  uint,
} from "@/lib/bankr/service";
import { loadPickemOgFonts } from "@/lib/og/pickem-card";
import { renderPickemPicksOgCard } from "@/lib/og/pickem-picks-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  try {
    const id = uint(contestId);
    const token = uint(
      request.nextUrl.searchParams.get("tokenId") || "invalid",
    );
    const c = await contest(id);
    if (!(await tokenIds(id)).includes(token))
      return new Response("Entry not found", { status: 404 });
    const [[entry], games] = await Promise.all([
      entries(c, [token]),
      matchups(c),
    ]);
    const gamesDecided = games.filter(g => g.completed).length;
    const correctPicks = games.reduce(
      (score, g, i) =>
        score +
        (g.completed &&
        g.homeScore !== undefined &&
        g.awayScore !== undefined &&
        g.homeScore !== g.awayScore &&
        entry.picks[i] === (g.homeScore > g.awayScore ? 1 : 0)
          ? 1
          : 0),
      0,
    );
    return new ImageResponse(
      renderPickemPicksOgCard({
        contestId: Number(id),
        tokenId: token.toString(),
        weekNumber: c.weekNumber,
        seasonTypeName:
          (
            { 1: "Preseason", 2: "Regular Season", 3: "Postseason" } as Record<
              number,
              string
            >
          )[c.seasonType] || "Season",
        year: Number(c.year),
        correctPicks,
        gamesDecided,
        totalGames: games.length,
        rank: null,
        totalEntries: Number(c.totalEntries),
      }),
      {
        ...PICKEM_OG_SIZES.og,
        fonts: await loadPickemOgFonts(
          process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin,
        ),
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Picks image unavailable", error);
    return new Response("Picks image temporarily unavailable", { status: 503 });
  }
}
