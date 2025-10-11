import { NextRequest, NextResponse } from "next/server";

interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  odds?: {
    details?: string;
    overUnder?: number;
    spread?: number;
    homeTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
    awayTeamOdds?: {
      favorite: boolean;
      underdog: boolean;
      moneyLine?: number;
      spreadOdds?: number;
    };
  };
}

interface ESPNTeam {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: string;
  winner: boolean;
  team: {
    id: string;
    uid: string;
    location: string;
    name: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    color: string;
    alternateColor: string;
    isActive: boolean;
    venue: {
      id: string;
    };
    links: Array<{
      rel: string[];
      href: string;
      text: string;
      isExternal: boolean;
      isPremium: boolean;
    }>;
    logo: string;
  };
  score: string;
  records: Array<{
    name: string;
    abbreviation: string;
    type: string;
    summary: string;
  }>;
}

interface ESPNGame {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    uid: string;
    date: string;
    attendance: number;
    type: {
      id: string;
      abbreviation: string;
    };
    timeValid: boolean;
    neutralSite: boolean;
    conferenceCompetition: boolean;
    playByPlayAvailable: boolean;
    recent: boolean;
    venue: {
      id: string;
      fullName: string;
    };
    competitors: ESPNTeam[];
    status: {
      clock: number;
      displayClock: string;
      period: number;
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
        description: string;
        detail: string;
        shortDetail: string;
      };
    };
    odds?: Array<{
      provider: {
        id: string;
        name: string;
      };
      details?: string;
      overUnder?: number;
      spread?: number;
      homeTeamOdds?: {
        favorite: boolean;
        underdog: boolean;
        moneyLine?: number;
        spreadOdds?: number;
      };
      awayTeamOdds?: {
        favorite: boolean;
        underdog: boolean;
        moneyLine?: number;
        spreadOdds?: number;
      };
    }>;
  }>;
}

interface ESPNResponse {
  events: ESPNGame[];
  leagues: Array<{
    id: string;
    season: {
      year: number;
      type: {
        id: string;
        type: number;
        name: string;
        abbreviation: string;
      };
    };
    week: {
      number: number;
    };
  }>;
}

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

    console.log(
      `Fetching ESPN data for year=${year}, seasonType=${seasonType}, week=${weekNumber}`,
    );

    // Use the format from the result.json example
    const espnResponse = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`,
      { next: { revalidate: 300 } }, // Cache for 5 minutes
    );

    console.log(`ESPN response status: ${espnResponse.status}`);

    if (!espnResponse.ok) {
      return NextResponse.json(
        { error: `ESPN API error: ${espnResponse.status}` },
        { status: espnResponse.status },
      );
    }

    const espnData: ESPNResponse = await espnResponse.json();

    // Extract games from the events
    const games: GameInfo[] = espnData.events.map(event => {
      const competition = event.competitions[0];
      if (!competition) {
        return {
          gameId: event.id,
          homeTeam: "TBD",
          awayTeam: "TBD",
          homeRecord: "(0-0)",
          awayRecord: "(0-0)",
          kickoff: new Date(event.date).toLocaleString(),
          status: "SCHEDULED",
        };
      }

      const homeTeam = competition.competitors.find(c => c.homeAway === "home");
      const awayTeam = competition.competitors.find(c => c.homeAway === "away");

      if (!homeTeam || !awayTeam) {
        return {
          gameId: event.id,
          homeTeam: "TBD",
          awayTeam: "TBD",
          homeRecord: "(0-0)",
          awayRecord: "(0-0)",
          kickoff: new Date(event.date).toLocaleString(),
          status: "SCHEDULED",
        };
      }

      // Extract odds if available (use the first odds provider, typically ESPN BET)
      const primaryOdds = competition.odds?.[0];
      const oddsData = primaryOdds
        ? {
            details: primaryOdds.details,
            overUnder: primaryOdds.overUnder,
            spread: primaryOdds.spread,
            homeTeamOdds: primaryOdds.homeTeamOdds
              ? {
                  favorite: primaryOdds.homeTeamOdds.favorite,
                  underdog: primaryOdds.homeTeamOdds.underdog,
                  moneyLine: primaryOdds.homeTeamOdds.moneyLine,
                  spreadOdds: primaryOdds.homeTeamOdds.spreadOdds,
                }
              : undefined,
            awayTeamOdds: primaryOdds.awayTeamOdds
              ? {
                  favorite: primaryOdds.awayTeamOdds.favorite,
                  underdog: primaryOdds.awayTeamOdds.underdog,
                  moneyLine: primaryOdds.awayTeamOdds.moneyLine,
                  spreadOdds: primaryOdds.awayTeamOdds.spreadOdds,
                }
              : undefined,
          }
        : undefined;

      return {
        gameId: event.id,
        homeTeam: homeTeam.team.displayName,
        awayTeam: awayTeam.team.displayName,
        homeAbbreviation: homeTeam.team.abbreviation,
        awayAbbreviation: awayTeam.team.abbreviation,
        homeRecord: homeTeam.records?.[0]?.summary || "(0-0)",
        awayRecord: awayTeam.records?.[0]?.summary || "(0-0)",
        kickoff: new Date(competition.date).toLocaleString(),
        homeLogo: homeTeam.team.logo,
        awayLogo: awayTeam.team.logo,
        homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
        awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
        status: competition.status.type.name,
        odds: oddsData,
      };
    });

    return NextResponse.json(games);
  } catch (error) {
    const e = error as Error;
    console.error("Error fetching week games:", e);
    return NextResponse.json(
      { error: "Failed to fetch week games: " + e.message },
      { status: 500 },
    );
  }
}
