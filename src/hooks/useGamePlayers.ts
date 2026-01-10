"use client";

import { useQuery } from "@tanstack/react-query";

export interface GameTeam {
  id: string;
  displayName: string;
  abbreviation?: string;
  logo?: string;
  homeAway?: "home" | "away";
}

export interface GamePlayer {
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
  team: GameTeam;
}

interface GamePlayersResponse {
  players: GamePlayer[];
  teams: GameTeam[];
}

interface UseGamePlayersResult {
  players: GamePlayer[];
  teams: GameTeam[];
  isLoading: boolean;
  error: Error | null;
}

export function useGamePlayers(gameId?: number | null): UseGamePlayersResult {
  const query = useQuery<GamePlayersResponse, Error>({
    queryKey: ["gamePlayers", gameId],
    enabled: Boolean(gameId),
    queryFn: async () => {
      const response = await fetch(`/api/games/${gameId}/players`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch game players");
      }

      return (await response.json()) as GamePlayersResponse;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    players: query.data?.players ?? [],
    teams: query.data?.teams ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
