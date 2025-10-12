import { NextRequest, NextResponse } from "next/server";

const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

interface LiveGameScore {
  gameId: string;
  homeScore: number;
  awayScore: number;
  winner: 0 | 1 | null; // 0 = away, 1 = home, null = tied or not started
  completed: boolean;
  status: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;
    const body = await request.json();
    const { gameIds, picks, year, seasonType, weekNumber } = body;

    if (!gameIds || !picks || !year || !seasonType || !weekNumber) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Fetch live scores from ESPN
    const espnResponse = await fetch(
      `${ESPN_BASE_URL}?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`,
      {
        next: { revalidate: 10 }, // Revalidate every 10 seconds for live data
      },
    );

    if (!espnResponse.ok) {
      throw new Error("Failed to fetch live scores from ESPN");
    }

    const espnData = await espnResponse.json();

    // Create a map of game scores
    const gameScoresMap = new Map<string, LiveGameScore>();

    espnData.events?.forEach((event: any) => {
      const competition = event.competitions?.[0];
      if (!competition) return;

      const homeTeam = competition.competitors?.find(
        (c: any) => c.homeAway === "home",
      );
      const awayTeam = competition.competitors?.find(
        (c: any) => c.homeAway === "away",
      );

      if (!homeTeam || !awayTeam) return;

      const homeScore = parseInt(homeTeam.score || "0");
      const awayScore = parseInt(awayTeam.score || "0");
      const completed = competition.status?.type?.completed || false;
      const status = competition.status?.type?.name || "SCHEDULED";

      let winner: 0 | 1 | null = null;
      if (homeScore > awayScore) {
        winner = 1; // home wins
      } else if (awayScore > homeScore) {
        winner = 0; // away wins
      }

      gameScoresMap.set(event.id, {
        gameId: event.id,
        homeScore,
        awayScore,
        winner,
        completed,
        status,
      });
    });

    // Calculate live rankings for each pick
    const rankedPicks = picks.map((pick: any) => {
      let correctPicks = 0;
      let totalScoredGames = 0; // Games that have started

      pick.picks.forEach((userPick: number, gameIndex: number) => {
        const gameId = gameIds[gameIndex];
        const liveScore = gameScoresMap.get(gameId);

        if (liveScore) {
          // Count game if it has started (has any score or is completed/in progress)
          const hasStarted =
            liveScore.homeScore > 0 ||
            liveScore.awayScore > 0 ||
            liveScore.status !== "SCHEDULED";

          if (hasStarted) {
            totalScoredGames++;
            // Only award points if there's a clear winner
            if (liveScore.winner !== null && userPick === liveScore.winner) {
              correctPicks++;
            }
          }
        }
      });

      return {
        ...pick,
        liveCorrectPicks: correctPicks,
        liveTotalScoredGames: totalScoredGames,
      };
    });

    // Sort by live correct picks
    rankedPicks.sort((a: any, b: any) => {
      if (b.liveCorrectPicks !== a.liveCorrectPicks) {
        return b.liveCorrectPicks - a.liveCorrectPicks;
      }
      // Secondary sort by tiebreaker
      return (
        Math.abs(b.tiebreakerPoints - 50) - Math.abs(a.tiebreakerPoints - 50)
      );
    });

    // Add ranks
    const rankedPicksWithRank = rankedPicks.map((pick: any, index: number) => ({
      ...pick,
      liveRank: index + 1,
    }));

    return NextResponse.json({
      picks: rankedPicksWithRank,
      gameScores: Array.from(gameScoresMap.values()),
    });
  } catch (error) {
    console.error("Error calculating live rankings:", error);
    return NextResponse.json(
      { error: "Failed to calculate live rankings" },
      { status: 500 },
    );
  }
}
