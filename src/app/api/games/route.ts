import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

// Validation schema for query parameters
const gamesQuerySchema = z.object({
  week: z.string().transform(Number),
  season: z.string().transform(Number),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const season = searchParams.get("season");

    if (!week || !season) {
      return NextResponse.json(
        { error: "Week and season parameters are required" },
        { status: 400 }
      );
    }

    const validatedParams = gamesQuerySchema.parse({ week, season });

    const response = await fetch(
      `${ESPN_BASE_URL}/scoreboard?week=${validatedParams.week}&seasontype=${validatedParams.season}`,
      {
        next: { revalidate: 60 }, // revalidate every minute
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch games from ESPN API");
    }

    const data = await response.json();
    
    // Transform the ESPN data to a simpler format for our frontend
    const games = data.events?.map((event: any) => ({
      id: event.id,
      name: event.name,
      shortName: event.shortName,
      date: event.date,
      status: {
        type: event.status.type.name,
        displayClock: event.status.displayClock,
        period: event.status.period,
      },
      competitions: event.competitions?.[0] ? {
        competitors: event.competitions[0].competitors?.map((comp: any) => ({
          id: comp.id,
          team: {
            id: comp.team.id,
            name: comp.team.name,
            displayName: comp.team.displayName,
            abbreviation: comp.team.abbreviation,
            logo: comp.team.logo,
          },
          score: comp.score,
          homeAway: comp.homeAway,
        })),
      } : null,
    })) || [];

    return NextResponse.json({
      games,
      week: data.week,
      season: data.season,
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
