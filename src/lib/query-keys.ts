import { chain } from "@/constants";

export const queryKeys = {
  // Contest data
  contest: (contestId: string) => ["contest", chain.id, contestId] as const,
  gameScores: (gameId: string) => ["gameScores", gameId] as const,
  gameDetails: (gameId: string) => ["gameDetails", gameId] as const,
  boxesContests: () => ["boxesContests", chain.id] as const,

  // Comments
  comments: (contestId: string) => ["comments", contestId] as const,

  // Games
  weekGames: (year: number, seasonType: number, week: number) =>
    ["weekGames", year, seasonType, week] as const,
  nflGames: (seasonType: string, week: string) =>
    ["nflGames", seasonType, week] as const,

  // Pick'em
  pickemContest: (contestId: number) => ["pickemContest", contestId] as const,
  adminContests: () => ["adminContests"] as const,
} as const;
