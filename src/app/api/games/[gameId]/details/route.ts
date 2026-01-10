import { NextRequest, NextResponse } from "next/server";

import {
  CACHE_TTL,
  getGameDetailsCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";

const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

interface Broadcast {
  type: {
    id: string;
    name: string;
    abbreviation: string;
  };
  market: {
    id: string;
    type: string;
  };
  media: {
    shortName: string;
  };
  lang: string;
  region: string;
}

interface Article {
  type: string;
  headline: string;
  description?: string;
  images?: Array<{
    name: string;
    width: number;
    height: number;
    url: string;
  }>;
  links: {
    web: {
      href: string;
      short?: string;
    };
    mobile?: {
      href: string;
    };
  };
}

interface GameDetails {
  gameId: string;
  date?: string;
  venue?: {
    fullName: string;
    address?: {
      city: string;
      state: string;
    };
  };
  weather?: {
    displayValue: string;
    temperature: number;
  };
  broadcasts?: Broadcast[];
  articles?: Article[];
  links?: Array<{
    rel: string[];
    href: string;
    text: string;
  }>;
}

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

    const cacheKey = getGameDetailsCacheKey(gameId);

    // Try Redis cache first
    let cachedDetails = null;
    if (redis) {
      const redisClient = redis; // Capture for closure
      cachedDetails = await safeRedisOperation(
        () => redisClient.get(cacheKey),
        null,
      );

      if (cachedDetails) {
        const parsedDetails =
          typeof cachedDetails === "string"
            ? JSON.parse(cachedDetails)
            : cachedDetails;
        return NextResponse.json(parsedDetails);
      }
    }

    // Fetch game data from ESPN API
    const response = await fetch(`${ESPN_BASE_URL}?event=${gameId}`, {
      next: { revalidate: 60 }, // revalidate every minute
    });

    if (!response.ok) {
      throw new Error("Failed to fetch game data from ESPN API");
    }

    const data = await response.json();

    if (data.Response === "Error") {
      throw new Error(`ESPN API error: ${data.Message}`);
    }

    // Extract header information
    const competition = data.header?.competitions?.[0];
    if (!competition) {
      throw new Error("Unable to find competition data");
    }

    const teams = competition.competitors || [];
    const homeTeamData = teams.find(
      (team: { homeAway: string }) => team.homeAway === "home",
    );
    const awayTeamData = teams.find(
      (team: { homeAway: string }) => team.homeAway === "away",
    );

    if (!homeTeamData || !awayTeamData) {
      throw new Error("Unable to find home or away team");
    }

    // Extract date information
    const date = competition.date || data.header?.date || undefined;

    // Extract venue information
    const venue = competition.venue
      ? {
          fullName: competition.venue.fullName || "",
          address: competition.venue.address
            ? {
                city: competition.venue.address.city || "",
                state: competition.venue.address.state || "",
              }
            : undefined,
        }
      : undefined;

    // Extract weather information
    const weather = competition.weather
      ? {
          displayValue: competition.weather.displayValue || "",
          temperature: competition.weather.temperature || 0,
        }
      : undefined;

    // Extract broadcast information
    const broadcasts: Broadcast[] = (competition.broadcasts || [])
      .filter(
        (broadcast: {
          type?: { id?: string; name?: string; abbreviation?: string };
          media?: { shortName?: string };
        }) => broadcast.type && broadcast.media?.shortName,
      )
      .map(
        (broadcast: {
          type: { id: string; name: string; abbreviation: string };
          market?: { id?: string; type?: string };
          media: { shortName: string };
          lang?: string;
          region?: string;
        }) => ({
          type: {
            id: broadcast.type.id || "",
            name: broadcast.type.name || "",
            abbreviation: broadcast.type.abbreviation || "",
          },
          market: {
            id: broadcast.market?.id || "",
            type: broadcast.market?.type || "",
          },
          media: {
            shortName: broadcast.media.shortName,
          },
          lang: broadcast.lang || "",
          region: broadcast.region || "",
        }),
      );

    // Extract articles
    const articles: Article[] = (data.articles || [])
      .filter(
        (article: {
          headline?: string;
          links?: { web?: { href?: string } };
        }) => article.headline && article.links?.web?.href,
      )
      .map(
        (article: {
          type?: string;
          headline: string;
          description?: string;
          images?: Array<{
            name: string;
            width: number;
            height: number;
            url: string;
          }>;
          links: {
            web: {
              href: string;
              short?: string;
            };
            mobile?: {
              href: string;
            };
          };
        }) => ({
          type: article.type || "",
          headline: article.headline,
          description: article.description,
          images: article.images,
          links: {
            web: {
              href: article.links.web.href,
              short: article.links.web.short,
            },
            mobile: article.links.mobile?.href
              ? {
                  href: article.links.mobile.href,
                }
              : undefined,
          },
        }),
      );

    // Extract general links (from header or competition)
    const links: Array<{ rel: string[]; href: string; text: string }> = [
      ...(data.header?.links || []),
      ...(competition.links || []),
    ]
      .filter(
        (link: { href?: string }) => link.href && link.href.startsWith("http"),
      )
      .map((link: { rel?: string[]; href: string; text?: string }) => ({
        rel: link.rel || [],
        href: link.href,
        text: link.text || "View on ESPN",
      }));

    const gameDetails: GameDetails = {
      gameId,
      date,
      venue,
      weather,
      broadcasts: broadcasts.length > 0 ? broadcasts : undefined,
      articles: articles.length > 0 ? articles : undefined,
      links: links.length > 0 ? links : undefined,
    };

    // Cache the result
    if (redis) {
      const redisClient = redis; // Capture for closure
      await safeRedisOperation(
        () =>
          redisClient.setex(
            cacheKey,
            CACHE_TTL.GAME_DETAILS,
            JSON.stringify(gameDetails),
          ),
        null,
      );
    }

    return NextResponse.json(gameDetails);
  } catch (error) {
    console.error("Error fetching game details:", error);
    return NextResponse.json(
      { error: "Failed to fetch game details" },
      { status: 500 },
    );
  }
}
