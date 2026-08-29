/**
 * Pure ESPN fetch/parse/pack logic — no onchain dependencies, unit-testable.
 * Ported verbatim from cre/workflow/espn.ts (the CRE workflow keeps this same
 * code so a future CRE migration is a config change, not a rewrite).
 * Packing formats must match CREScoreOracle.sol.
 */
import { encodeAbiParameters, parseAbiParameters } from "viem";

export const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";
export const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export const GAME_SCORES_PARAMS = parseAbiParameters(
  "uint8 reportType, uint256 gameId, uint8 qComplete, bool gameCompleted, uint8 totalScoreChanges, uint256 packedQuarterScores, uint256 packedQuarterDigits",
);
export const SCORE_CHANGES_PARAMS = parseAbiParameters(
  "uint8 reportType, uint256 gameId, uint8 totalScoreChanges, uint256[] packedScoreChanges",
);
export const WEEK_GAMES_PARAMS = parseAbiParameters(
  "uint8 reportType, uint256 weekId, uint8 gameCount, uint256[] packedGameIds",
);
export const WEEK_RESULTS_PARAMS = parseAbiParameters(
  "uint8 reportType, uint256 weekId, uint256 allCompleted, uint8 gameCount, uint256 packedResults, uint256 tiebreakerTotalPoints, uint256 tiebreakerGameId",
);

// Minimal structural types for the ESPN API fields we actually read.
export interface EspnCompetitor {
  homeAway: string;
  score?: string;
  linescores?: { displayValue?: string }[];
}

export interface EspnSummary {
  header: {
    competitions: {
      competitors: EspnCompetitor[];
      status: { type: { completed?: boolean }; period?: number };
    }[];
  };
  scoringPlays?: { homeScore?: number; awayScore?: number }[];
}

export interface EspnScoreboardEvent {
  id: string;
  date: string;
  competitions: { competitors: EspnCompetitor[] }[];
  status: { type: { completed?: boolean } };
}

export interface EspnScoreboard {
  events?: EspnScoreboardEvent[];
}

const lastDigit = (n: number): bigint => BigInt(n.toString().slice(-1));

export const fetchJson = async <T = unknown>(url: string): Promise<T> => {
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      // ESPN edge 403s browser-impersonating UAs but allows curl
      "User-Agent": "curl/8.0",
    },
    cache: "no-store",
  });
  if (!resp.ok) throw new Error(`ESPN HTTP ${resp.status} for ${url}`);
  return resp.json() as Promise<T>;
};

export const fetchGameSummary = (
  gameId: bigint | string,
): Promise<EspnSummary> => fetchJson<EspnSummary>(`${ESPN_SUMMARY}?event=${gameId}`);

export const fetchWeekScoreboard = (
  year: bigint | number,
  seasonType: number,
  weekNumber: number,
): Promise<EspnScoreboard> =>
  fetchJson<EspnScoreboard>(
    `${ESPN_SCOREBOARD}?year=${year}&seasontype=${seasonType}&week=${weekNumber}`,
  );

// ---------- game scores (reportType 0) ----------

export const buildGameScoresPayload = (
  data: EspnSummary,
  gameId: bigint,
): `0x${string}` => {
  const teams = data.header.competitions[0].competitors;
  const homeTeam = teams.find((t) => t.homeAway === "home");
  const awayTeam = teams.find((t) => t.homeAway === "away");
  if (!homeTeam || !awayTeam)
    throw new Error("Unable to find home or away team");

  const gameCompleted =
    data.header.competitions[0].status.type.completed || false;
  const qComplete = gameCompleted
    ? 100
    : (data.header.competitions[0].status.period || 1) - 1;

  const homeScores = homeTeam.linescores || [];
  const awayScores = awayTeam.linescores || [];
  const homeQ1 = qComplete < 1 ? 0 : parseInt(homeScores[0]?.displayValue || "0");
  const homeQ2 = qComplete < 2 ? 0 : parseInt(homeScores[1]?.displayValue || "0");
  const homeQ3 = qComplete < 3 ? 0 : parseInt(homeScores[2]?.displayValue || "0");
  const homeF = qComplete < 100 ? 0 : parseInt(homeTeam.score || "0");
  const awayQ1 = qComplete < 1 ? 0 : parseInt(awayScores[0]?.displayValue || "0");
  const awayQ2 = qComplete < 2 ? 0 : parseInt(awayScores[1]?.displayValue || "0");
  const awayQ3 = qComplete < 3 ? 0 : parseInt(awayScores[2]?.displayValue || "0");
  const awayF = qComplete < 100 ? 0 : parseInt(awayTeam.score || "0");

  // cumulative quarter digits (Q1, Q1+Q2, Q1+Q2+Q3, F)
  const digits = [
    qComplete < 1 ? 0n : lastDigit(homeQ1),
    qComplete < 2 ? 0n : lastDigit(homeQ1 + homeQ2),
    qComplete < 3 ? 0n : lastDigit(homeQ1 + homeQ2 + homeQ3),
    lastDigit(homeF),
    qComplete < 1 ? 0n : lastDigit(awayQ1),
    qComplete < 2 ? 0n : lastDigit(awayQ1 + awayQ2),
    qComplete < 3 ? 0n : lastDigit(awayQ1 + awayQ2 + awayQ3),
    lastDigit(awayF),
  ];
  let packedDigits = 0n;
  for (let i = 0; i < 8; i++) packedDigits |= digits[i] << BigInt(252 - i * 4);

  const scores = [homeQ1, homeQ2, homeQ3, homeF, awayQ1, awayQ2, awayQ3, awayF];
  let packedScores = 0n;
  for (let i = 0; i < 8; i++)
    packedScores |= BigInt(scores[i]) << BigInt(248 - i * 8);

  const totalScoreChanges = (data.scoringPlays || []).length;

  return encodeAbiParameters(GAME_SCORES_PARAMS, [
    0,
    gameId,
    qComplete,
    gameCompleted,
    totalScoreChanges,
    packedScores,
    packedDigits,
  ]);
};

// ---------- score changes (reportType 1) ----------

export const buildScoreChangesPayload = (
  data: EspnSummary,
  gameId: bigint,
): `0x${string}` => {
  const scoreChanges = data.scoringPlays || [];
  const packed: bigint[] = [];
  for (let i = 0; i < Math.min(scoreChanges.length, 64); i += 8) {
    let word = 0n;
    for (let j = 0; j < 8 && i + j < scoreChanges.length; j++) {
      const c = scoreChanges[i + j];
      const packedChange =
        (lastDigit(c.homeScore || 0) << 4n) | lastDigit(c.awayScore || 0);
      word |= packedChange << BigInt(j * 32);
    }
    packed.push(word);
  }
  return encodeAbiParameters(SCORE_CHANGES_PARAMS, [
    1,
    gameId,
    scoreChanges.length,
    packed,
  ]);
};

// ---------- week games (reportType 2) ----------

export const buildWeekGamesPayload = (
  data: EspnScoreboard,
  weekId: bigint,
): `0x${string}` => {
  const events = (data?.events || []).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const packed: bigint[] = [];
  for (let i = 0; i < events.length; i += 3) {
    let word = 0n;
    if (i < events.length) word |= BigInt(events[i].id) << 170n;
    if (i + 1 < events.length) word |= BigInt(events[i + 1].id) << 85n;
    if (i + 2 < events.length) word |= BigInt(events[i + 2].id);
    packed.push(word);
  }
  return encodeAbiParameters(WEEK_GAMES_PARAMS, [2, weekId, events.length, packed]);
};

// ---------- week results (reportType 3) ----------

export const buildWeekResultsPayload = async (
  weekId: bigint,
  scoreboardData: EspnScoreboard,
  fetchSummary: (gameId: string) => Promise<EspnSummary>,
): Promise<`0x${string}`> => {
  const events = (scoreboardData?.events || []).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  let packedResults = 0n;
  let completed = 0;
  let latestGame: string | null = null;
  let latestDate = 0;
  for (let i = 0; i < events.length; i++) {
    const v = events[i];
    const competitors = v.competitions[0].competitors;
    const home = competitors.find((t) => t.homeAway === "home");
    const away = competitors.find((t) => t.homeAway === "away");
    if (v.status.type.completed && home && away) {
      if (Number(home.score) > Number(away.score))
        packedResults |= 1n << BigInt(i);
      completed++;
    }
    const d = new Date(v.date).getTime();
    if (d > latestDate) {
      latestDate = d;
      latestGame = v.id;
    }
  }

  let totalPoints = 0n;
  let tiebreakerGameId = 0n;
  if (latestGame) {
    tiebreakerGameId = BigInt(latestGame);
    const g = await fetchSummary(latestGame);
    const comp = g?.header?.competitions?.[0]?.competitors || [];
    for (const c of comp) totalPoints += BigInt(parseInt(c.score || "0"));
  }

  const allCompleted = completed === events.length ? 1n : 0n;
  return encodeAbiParameters(WEEK_RESULTS_PARAMS, [
    3,
    weekId,
    allCompleted,
    events.length,
    packedResults,
    totalPoints,
    tiebreakerGameId,
  ]);
};

export const calculateWeekId = (
  year: bigint,
  seasonType: number,
  weekNumber: number,
): bigint => (year << 16n) | (BigInt(seasonType) << 8n) | BigInt(weekNumber);

export const weekIdToParams = (
  weekId: bigint,
): { year: bigint; seasonType: number; weekNumber: number } => ({
  year: weekId >> 16n,
  seasonType: Number((weekId >> 8n) & 0xffn),
  weekNumber: Number(weekId & 0xffn),
});
