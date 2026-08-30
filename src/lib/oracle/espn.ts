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
      date?: string;
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

export interface CurrentWeekInfo {
  year: bigint;
  seasonType: number;
  weekNumber: number;
}

/**
 * Ask ESPN which NFL week is current. Fetches the default scoreboard (no
 * params) which ESPN automatically sets to the current active week.
 * Returns null when the response is missing the required fields.
 */
export const fetchCurrentWeekInfo = async (): Promise<CurrentWeekInfo | null> => {
  const data = await fetchJson<{
    season?: { year?: number; type?: number };
    week?: { number?: number };
  }>(ESPN_SCOREBOARD);
  const year = data?.season?.year;
  const seasonType = data?.season?.type;
  const weekNumber = data?.week?.number;
  if (!year || !seasonType || !weekNumber) return null;
  return { year: BigInt(year), seasonType, weekNumber };
};

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

/**
 * Extract sorted game IDs from a scoreboard response -- the same ordering
 * used by buildWeekGamesPayload so comparison is apples-to-apples.
 */
export const extractSortedGameIds = (data: EspnScoreboard): bigint[] =>
  (data?.events || [])
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => BigInt(e.id));

/**
 * Returns true when the ESPN slate differs from what is currently stored
 * onchain, meaning a weekGames report should be submitted.
 *
 * Comparison is order-insensitive: two slates with the same game IDs in
 * different order are considered equal (they encode to the same packed words
 * because both sides sort by id before packing).
 *
 * Pass onchainIds=[] to indicate no slate has been written yet (always dirty).
 */
export const weekGamesMismatched = (
  espnIds: bigint[],
  onchainIds: bigint[],
): boolean => {
  if (onchainIds.length === 0) return true;
  if (espnIds.length !== onchainIds.length) return true;
  const espnSet = new Set(espnIds.map(String));
  return onchainIds.some((id) => !espnSet.has(id.toString()));
};

// ---------- week results (reportType 3) ----------

/** A game resolved to the fields week results depend on, from either source. */
interface ResolvedGame {
  id: string;
  date: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
}

export type WeekResultsBuild =
  | { ok: true; payload: `0x${string}` }
  | { ok: false; reason: string };

const resolveFromEvent = (v: EspnScoreboardEvent): ResolvedGame | null => {
  const competitors = v.competitions?.[0]?.competitors || [];
  const home = competitors.find((t) => t.homeAway === "home");
  const away = competitors.find((t) => t.homeAway === "away");
  if (!home || !away) return null;
  return {
    id: v.id,
    date: v.date,
    completed: !!v.status?.type?.completed,
    homeScore: Number(home.score),
    awayScore: Number(away.score),
  };
};

const resolveFromSummary = (
  gameId: string,
  g: EspnSummary,
): ResolvedGame | null => {
  const comp = g?.header?.competitions?.[0];
  const competitors = comp?.competitors || [];
  const home = competitors.find((t) => t.homeAway === "home");
  const away = competitors.find((t) => t.homeAway === "away");
  if (!comp?.date || !home || !away) return null;
  return {
    id: gameId,
    date: comp.date,
    completed: !!comp.status?.type?.completed,
    homeScore: Number(home.score),
    awayScore: Number(away.score),
  };
};

/**
 * Build the week results payload against the game list already stored onchain.
 *
 * Pickem's finalizeGames pairs winner bit `i` with its contest's game id `i`,
 * so bit order here must be the oracle's stored order — never a fresh sort of
 * whatever ESPN currently lists for the week. Games missing from the week's
 * scoreboard (postponed or rescheduled out of the week) are resolved
 * individually by game id, which is stable across a reschedule.
 *
 * Returns { ok: false } rather than throwing so one bad week cannot abort a
 * sync run covering other weeks. The caller writes nothing in that case.
 */
export const buildWeekResultsPayload = async (
  weekId: bigint,
  onchainGameIds: bigint[],
  scoreboardData: EspnScoreboard,
  fetchSummary: (gameId: string) => Promise<EspnSummary>,
): Promise<WeekResultsBuild> => {
  if (onchainGameIds.length === 0)
    return { ok: false, reason: "no-onchain-games" };
  if (onchainGameIds.length > 255)
    return { ok: false, reason: "game-count-overflows-uint8" };
  // getWeekGames sizes its array from gamesCount and leaves any shortfall as
  // zeros; a zero id means the stored list is short and cannot be trusted.
  if (onchainGameIds.some((id) => id === 0n))
    return { ok: false, reason: "zero-game-id-onchain" };

  const byId = new Map<string, EspnScoreboardEvent>();
  for (const v of scoreboardData?.events || []) byId.set(v.id, v);

  const games: ResolvedGame[] = [];
  for (const id of onchainGameIds) {
    const key = id.toString();
    const ev = byId.get(key);
    let game = ev ? resolveFromEvent(ev) : null;
    if (!game) {
      try {
        game = resolveFromSummary(key, await fetchSummary(key));
      } catch {
        game = null;
      }
    }
    if (!game) return { ok: false, reason: `unresolved-game:${key}` };
    games.push(game);
  }

  let packedResults = 0n;
  let completed = 0;
  let latestGame: string | null = null;
  let latestDate = 0;
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    if (g.completed) {
      if (g.homeScore > g.awayScore) packedResults |= 1n << BigInt(i);
      completed++;
    }
    const d = new Date(g.date).getTime();
    if (Number.isFinite(d) && d > latestDate) {
      latestDate = d;
      latestGame = g.id;
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

  const allCompleted = completed === games.length ? 1n : 0n;
  return {
    ok: true,
    payload: encodeAbiParameters(WEEK_RESULTS_PARAMS, [
      3,
      weekId,
      allCompleted,
      games.length,
      packedResults,
      totalPoints,
      tiebreakerGameId,
    ]),
  };
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
