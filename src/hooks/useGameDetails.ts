import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

export interface Broadcast {
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

export interface Article {
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

export interface GameDetails {
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

export function useGameDetails(gameId: string | number | null | undefined) {
  const gameIdString = gameId?.toString();

  return useQuery({
    queryKey: queryKeys.gameDetails(gameIdString ?? ""),
    queryFn: async () => {
      if (!gameIdString) return null;
      const response = await fetch(`/api/games/${gameIdString}/details`);
      if (!response.ok) return null;
      return response.json() as Promise<GameDetails>;
    },
    enabled: !!gameIdString,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
