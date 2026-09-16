import { NextResponse } from "next/server";

const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

export async function GET() {
  try {
    const response = await fetch(`${ESPN_BASE_URL}/scoreboard`, {
      // Keep data fresh: serve a cached copy for up to 5 minutes,
      // revalidate in the background for the next 55 minutes.
      // This replaces the previous 24-hour cache which left clients
      // stuck on last week's number until a full day elapsed.
      next: { revalidate: 5 * 60 },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch current week/season from ESPN API");
    }

    const data = await response.json();

    // Get current season/week from the first event if available
    const firstEvent = data.events?.[0];

    if (firstEvent) {
      return NextResponse.json({
        week: firstEvent.week?.number || 1,
        season: firstEvent.season?.type || 2, // Default to regular season
        seasonYear: firstEvent.season?.year || new Date().getFullYear(),
      });
    }

    // Fallback to the top-level data if no events are available
    return NextResponse.json({
      week: data.week?.number || 1,
      season: data.season?.type || 2, // Default to regular season
      seasonYear: data.season?.year || new Date().getFullYear(),
    });
  } catch (error) {
    console.error("Error fetching current week/season:", error);
    return NextResponse.json(
      { error: "Failed to fetch current week/season" },
      { status: 500 },
    );
  }
}
