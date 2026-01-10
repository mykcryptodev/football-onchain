import { NextRequest, NextResponse } from "next/server";

const ESPN_SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
const ESPN_TEAM_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

interface TeamInfo {
  id: string;
  displayName: string;
  abbreviation?: string;
  logo?: string;
  homeAway?: "home" | "away";
}

interface PlayerInfo {
  id: string;
  fullName: string;
  displayName?: string;
  shortName?: string;
  position?: string;
  jersey?: string;
  age?: number;
  height?: string;
  weight?: number;
  experience?: number;
  college?: string;
  headshot?: string;
  team: TeamInfo;
}

const extractTeamInfo = (team: {
  team?: {
    id?: string | number;
    displayName?: string;
    abbreviation?: string;
    logo?: string;
  };
  homeAway?: "home" | "away";
}): TeamInfo => ({
  id: team.team?.id?.toString() ?? "",
  displayName: team.team?.displayName ?? "Team",
  abbreviation: team.team?.abbreviation,
  logo: team.team?.logo,
  homeAway: team.homeAway,
});

const getPlayerItems = (group: {
  items?: unknown[];
  athletes?: unknown[];
  players?: unknown[];
  roster?: unknown[];
}) => {
  if (Array.isArray(group.items)) return group.items;
  if (Array.isArray(group.athletes)) return group.athletes;
  if (Array.isArray(group.players)) return group.players;
  if (Array.isArray(group.roster)) return group.roster;
  return [];
};

const formatPlayer = (
  player: {
    id?: string | number;
    fullName?: string;
    displayName?: string;
    shortName?: string;
    position?: { abbreviation?: string; name?: string };
    jersey?: string;
    age?: number;
    height?: string;
    weight?: number;
    experience?: { years?: number } | number;
    college?: { name?: string };
    headshot?: { href?: string; url?: string };
  },
  team: TeamInfo,
  positionFallback?: string,
): PlayerInfo | null => {
  if (!player.id) return null;

  const experienceYears =
    typeof player.experience === "number"
      ? player.experience
      : player.experience?.years;

  return {
    id: player.id.toString(),
    fullName:
      player.fullName || player.displayName || player.shortName || "Player",
    displayName: player.displayName,
    shortName: player.shortName,
    position: player.position?.abbreviation || player.position?.name || positionFallback,
    jersey: player.jersey,
    age: player.age,
    height: player.height,
    weight: player.weight,
    experience: experienceYears,
    college: player.college?.name,
    headshot: player.headshot?.href || player.headshot?.url,
    team,
  };
};

const parseRosterPlayers = (rosterData: {
  athletes?: Array<{
    position?: { abbreviation?: string; name?: string };
    items?: unknown[];
    athletes?: unknown[];
  }>;
  team?: { athletes?: Array<unknown> };
}) => {
  if (Array.isArray(rosterData.athletes)) return rosterData.athletes;
  if (Array.isArray(rosterData.team?.athletes)) {
    return rosterData.team?.athletes ?? [];
  }
  return [];
};

export async function GET(
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

    const summaryResponse = await fetch(`${ESPN_SUMMARY_URL}?event=${gameId}`, {
      next: { revalidate: 300 },
    });

    if (!summaryResponse.ok) {
      throw new Error("Failed to fetch game summary from ESPN");
    }

    const summaryData = await summaryResponse.json();
    const competitors = summaryData?.header?.competitions?.[0]?.competitors ?? [];

    const teams: TeamInfo[] = competitors.map(extractTeamInfo).filter(team => team.id);

    const rosterResponses = await Promise.all(
      teams.map(async team => {
        const rosterResponse = await fetch(
          `${ESPN_TEAM_URL}/${team.id}/roster`,
          { next: { revalidate: 300 } },
        );
        if (!rosterResponse.ok) {
          return { team, rosterData: null };
        }
        return { team, rosterData: await rosterResponse.json() };
      }),
    );

    const players = rosterResponses.flatMap(({ team, rosterData }) => {
      if (!rosterData) return [];

      const rosterGroups = parseRosterPlayers(rosterData);

      return rosterGroups.flatMap(group => {
        const positionFallback =
          (group as { position?: { abbreviation?: string; name?: string } })
            ?.position?.abbreviation ||
          (group as { position?: { abbreviation?: string; name?: string } })
            ?.position?.name;
        const items = getPlayerItems(
          group as {
            items?: unknown[];
            athletes?: unknown[];
            players?: unknown[];
            roster?: unknown[];
          },
        );

        return items
          .map(item =>
            formatPlayer(
              item as {
                id?: string | number;
                fullName?: string;
                displayName?: string;
                shortName?: string;
                position?: { abbreviation?: string; name?: string };
                jersey?: string;
                age?: number;
                height?: string;
                weight?: number;
                experience?: { years?: number } | number;
                college?: { name?: string };
                headshot?: { href?: string; url?: string };
              },
              team,
              positionFallback,
            ),
          )
          .filter((player): player is PlayerInfo => Boolean(player));
      });
    });

    return NextResponse.json({ players, teams });
  } catch (error) {
    console.error("Error fetching game players:", error);
    return NextResponse.json(
      { error: "Failed to fetch game players" },
      { status: 500 },
    );
  }
}
