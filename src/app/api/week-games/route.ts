import { NextRequest, NextResponse } from "next/server";

import { fetchWeekGames } from "@/lib/week-games";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const seasonType = searchParams.get("seasonType");
    const weekNumber = searchParams.get("week");

    if (!year || !seasonType || !weekNumber) {
      return NextResponse.json(
        { error: "Missing required parameters: year, seasonType, week" },
        { status: 400 },
      );
    }

    const yearNum = parseInt(year);
    const seasonTypeNum = parseInt(seasonType);
    const weekNum = parseInt(weekNumber);

    if (isNaN(yearNum) || isNaN(seasonTypeNum) || isNaN(weekNum)) {
      return NextResponse.json(
        { error: "Invalid parameter types" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await fetchWeekGames(yearNum, seasonTypeNum, weekNum),
    );
  } catch (error) {
    const e = error as Error;
    console.error("Error fetching week games:", e);
    return NextResponse.json(
      { error: "Failed to fetch week games: " + e.message },
      { status: 500 },
    );
  }
}
