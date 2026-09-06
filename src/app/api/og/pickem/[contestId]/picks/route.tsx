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
import {
  type PickCardEntry,
  renderPickemPicksOgCard,
} from "@/lib/og/pickem-picks-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEASON_TYPE_NAMES: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

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

    // `games[i]` and `entry.picks[i]` both come from `c.gameIds` in the
    // same order (see src/lib/bankr/service.ts), so they line up by index
    // with no reordering needed.
    const picks: PickCardEntry[] = games.map((g, i) => {
      const homeWon =
        g.completed &&
        g.homeScore !== undefined &&
        g.awayScore !== undefined &&
        g.homeScore !== g.awayScore
          ? g.homeScore > g.awayScore
          : null;
      const pickedHome = entry.picks[i] === 1;
      const result: PickCardEntry["result"] =
        homeWon === null ? "pending" : pickedHome === homeWon ? "correct" : "wrong";
      return {
        number: i + 1,
        team: pickedHome ? g.home : g.away,
        opponent: pickedHome ? g.away : g.home,
        result,
      };
    });
    const correctPicks = picks.filter(p => p.result === "correct").length;
    const gamesDecided = picks.filter(p => p.result !== "pending").length;

    return new ImageResponse(
      renderPickemPicksOgCard({
        contestId: Number(id),
        tokenId: token.toString(),
        weekNumber: c.weekNumber,
        seasonTypeName: SEASON_TYPE_NAMES[c.seasonType] || "Season",
        year: Number(c.year),
        correctPicks,
        gamesDecided,
        picks,
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
