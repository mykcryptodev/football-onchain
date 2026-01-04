import { NextRequest, NextResponse } from "next/server";

const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params;

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 },
      );
    }

    // Fetch fresh game data from ESPN API (bypassing cache)
    const response = await fetch(`${ESPN_BASE_URL}?event=${gameId}`, {
      cache: "no-store", // Force fresh data
    });

    if (!response.ok) {
      throw new Error("Failed to fetch game data from ESPN API");
    }

    const data = await response.json();

    if (data.Response === "Error") {
      throw new Error(`ESPN API error: ${data.Message}`);
    }

    // Extract teams and game status
    const teams = data.header.competitions[0].competitors;
    const homeTeam = teams.find(
      (team: { homeAway: string }) => team.homeAway === "home",
    );
    const awayTeam = teams.find(
      (team: { homeAway: string }) => team.homeAway === "away",
    );

    if (!homeTeam || !awayTeam) {
      throw new Error("Unable to find home or away team");
    }

    // Get game completion status
    const gameCompleted =
      data.header.competitions[0].status.type.completed || false;
    const qComplete = gameCompleted
      ? 100
      : data.header.competitions[0].status.period - 1;

    // Extract quarter scores
    const homeTeamScores = homeTeam.linescores || [];
    const awayTeamScores = awayTeam.linescores || [];

    // Calculate quarter scores
    const homeQ1 =
      qComplete < 1 ? 0 : parseInt(homeTeamScores[0]?.displayValue || 0);
    const homeQ2 =
      qComplete < 2 ? 0 : parseInt(homeTeamScores[1]?.displayValue || 0);
    const homeQ3 =
      qComplete < 3 ? 0 : parseInt(homeTeamScores[2]?.displayValue || 0);
    const homeF = qComplete < 100 ? 0 : parseInt(homeTeam.score || 0);

    const awayQ1 =
      qComplete < 1 ? 0 : parseInt(awayTeamScores[0]?.displayValue || 0);
    const awayQ2 =
      qComplete < 2 ? 0 : parseInt(awayTeamScores[1]?.displayValue || 0);
    const awayQ3 =
      qComplete < 3 ? 0 : parseInt(awayTeamScores[2]?.displayValue || 0);
    const awayF = qComplete < 100 ? 0 : parseInt(awayTeam.score || 0);

    // Calculate last digits for each quarter (cumulative scores)
    const homeQ1LastDigit =
      qComplete < 1 ? 0 : parseInt(homeQ1.toString().slice(-1));
    const homeQ2LastDigit =
      qComplete < 2 ? 0 : parseInt((homeQ1 + homeQ2).toString().slice(-1));
    const homeQ3LastDigit =
      qComplete < 3
        ? 0
        : parseInt((homeQ1 + homeQ2 + homeQ3).toString().slice(-1));
    const homeFLastDigit = parseInt(homeF.toString().slice(-1));

    const awayQ1LastDigit =
      qComplete < 1 ? 0 : parseInt(awayQ1.toString().slice(-1));
    const awayQ2LastDigit =
      qComplete < 2 ? 0 : parseInt((awayQ1 + awayQ2).toString().slice(-1));
    const awayQ3LastDigit =
      qComplete < 3
        ? 0
        : parseInt((awayQ1 + awayQ2 + awayQ3).toString().slice(-1));
    const awayFLastDigit = parseInt(awayF.toString().slice(-1));

    // Extract scoring plays
    const scoringPlays = data.scoringPlays || [];

    // Format the game score data
    const formattedGameScore = {
      id: parseInt(gameId),
      homeQ1LastDigit,
      homeQ2LastDigit,
      homeQ3LastDigit,
      homeFLastDigit,
      awayQ1LastDigit,
      awayQ2LastDigit,
      awayQ3LastDigit,
      awayFLastDigit,
      qComplete: qComplete === 100 ? 4 : qComplete, // Convert 100 to 4 for final
      requestInProgress: false, // Always false since we're fetching directly
      homeTeamName: homeTeam.team?.displayName || homeTeam.team?.name || "Home Team",
      awayTeamName: awayTeam.team?.displayName || awayTeam.team?.name || "Away Team",
      homeTeamColor: homeTeam.team?.color,
      awayTeamColor: awayTeam.team?.color,
      scoringPlays: scoringPlays.map(
        (play: {
          id: string;
          text: string;
          type: { id: string; text: string; abbreviation: string };
          awayScore?: number;
          homeScore?: number;
          period: { number: number };
          clock: { value?: number; displayValue: string };
          team: {
            id: string;
            displayName: string;
            abbreviation: string;
            logo: string;
          };
          scoringType: {
            name: string;
            displayName: string;
            abbreviation: string;
          };
        }) => ({
          id: play.id,
          type: {
            id: play.type.id,
            text: play.type.text,
            abbreviation: play.type.abbreviation,
          },
          text: play.text,
          awayScore: play.awayScore,
          homeScore: play.homeScore,
          period: {
            number: play.period.number,
          },
          clock: {
            value: play.clock.value,
            displayValue: play.clock.displayValue,
          },
          team: {
            id: play.team.id,
            displayName: play.team.displayName,
            abbreviation: play.team.abbreviation,
            logo: play.team.logo,
          },
          scoringType: {
            name: play.scoringType.name,
            displayName: play.scoringType.displayName,
            abbreviation: play.scoringType.abbreviation,
          },
        }),
      ),
    };

    return NextResponse.json({
      message: "Game scores refreshed successfully",
      gameScore: formattedGameScore,
    });
  } catch (error) {
    console.error("Error refreshing game scores:", error);
    return NextResponse.json(
      { error: "Failed to refresh game scores" },
      { status: 500 },
    );
  }
}
