import { chain } from "@/constants";

export const queryKeys = {
  contest: (contestId: string) => ["contest", chain.id, contestId] as const,
  gameScores: (gameId: string) => ["gameScores", gameId] as const,
  gameDetails: (gameId: string) => ["gameDetails", gameId] as const,
  boxesContests: () => ["boxesContests", chain.id] as const,
  boxListings: (contestId: string) =>
    ["boxListings", chain.id, contestId] as const,

  // Comments
  comments: (contestId: string) => ["comments", contestId] as const,

  // Games
  weekGames: (year: number, seasonType: number, week: number) =>
    ["weekGames", year, seasonType, week] as const,
  nflGames: (seasonType: string, week: string) =>
    ["nflGames", seasonType, week] as const,

  // Pick'em
  pickemContest: (contestId: number) => ["pickemContest", contestId] as const,
  pickemContests: () => ["pickemContests", chain.id] as const,
  adminContests: () => ["adminContests"] as const,
  currentNflWeek: () => ["currentNflWeek"] as const,
  myCurrentWeekPicks: (address?: string, weekKey?: string) =>
    ["myCurrentWeekPicks", chain.id, address, weekKey] as const,
} as const;
