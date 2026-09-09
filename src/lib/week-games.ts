/**
 * ESPN weekly scoreboard fetch and mapping, shared by `/api/week-games` and
 * the server-side leaderboard.
 *
 * Both consumers must score a contest from byte-identical inputs, so this is
 * a straight lift of what the route used to do inline — one ESPN scoreboard
 * request for the whole week, mapped to `GameInfo`. `status` matters: the
 * scoring helpers in `pickem-scoring.ts` use it to tell an in-progress game
 * from a scheduled one, and the per-game `matchups()` cache does not carry it.
 */
export interface GameInfo {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation?: string;
  awayAbbreviation?: string;
  homeRecord: string;
  awayRecord: string;
  kickoff: string; // ISO 8601 timestamp in UTC
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  completed?: boolean;
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

export async function fetchWeekGames(
  year: number,
  seasonType: number,
  weekNumber: number,
): Promise<GameInfo[]> {
  // Use the format from the result.json example
  const espnResponse = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${year}&seasontype=${seasonType}&week=${weekNumber}`,
    { next: { revalidate: 300 } }, // Cache for 5 minutes
  );

  if (!espnResponse.ok) {
    throw new Error(`ESPN API error: ${espnResponse.status}`);
  }

  const espnData: ESPNResponse = await espnResponse.json();

  // Extract games from the events
  const games: GameInfo[] = espnData.events.map(event => {
    const competition = event.competitions[0];
    const kickoff = competition?.date ?? event.date;
    if (!competition) {
      return {
        gameId: event.id,
        homeTeam: "TBD",
        awayTeam: "TBD",
        homeRecord: "(0-0)",
        awayRecord: "(0-0)",
        kickoff,
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
        kickoff,
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
      kickoff,
      homeLogo: homeTeam.team.logo,
      awayLogo: awayTeam.team.logo,
      homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
      awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
      status: competition.status.type.name,
      completed: competition.status.type.completed,
      odds: oddsData,
    };
  });

  return games;
}
