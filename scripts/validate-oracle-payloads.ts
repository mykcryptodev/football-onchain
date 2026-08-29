/**
 * Live-data harness for the app-side oracle writer: runs the payload builders
 * in src/lib/oracle/espn.ts against real ESPN data and decodes the results —
 * proving the encode side matches what CREScoreOracle.sol decodes.
 *
 * Run: bun run scripts/validate-oracle-payloads.ts
 */
import { decodeAbiParameters } from "viem";

import {
  buildGameScoresPayload,
  buildScoreChangesPayload,
  buildWeekGamesPayload,
  buildWeekResultsPayload,
  calculateWeekId,
  ESPN_SUMMARY,
  ESPN_SCOREBOARD,
  fetchJson,
  GAME_SCORES_PARAMS,
  SCORE_CHANGES_PARAMS,
  WEEK_GAMES_PARAMS,
  WEEK_RESULTS_PARAMS,
} from "../src/lib/oracle/espn";

const GAME_ID = 401873277n; // MIA 7 @ WSH 20, final (WSH home) — the contest 82 game

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`,
  );
};

// ---- game scores ----
const summary = await fetchJson(`${ESPN_SUMMARY}?event=${GAME_ID}`);
const gsPayload = buildGameScoresPayload(summary, GAME_ID);
const [
  rt0,
  gameId,
  qComplete,
  gameCompleted,
  totalScoreChanges,
  packedScores,
  packedDigits,
] = decodeAbiParameters(GAME_SCORES_PARAMS, gsPayload);

check("reportType", rt0, 0);
check("gameId", gameId, GAME_ID);
check("qComplete", qComplete, 100);
check("gameCompleted", gameCompleted, true);
check("totalScoreChanges", totalScoreChanges, 5);

// WSH (home) quarters 0,17,0,F20 → cumulative digits 0,7,7,0 ; MIA (away) 7,0,0,F7 → 7,7,7,7
const digitAt = (packed: bigint, i: number) =>
  Number((packed >> BigInt(252 - i * 4)) & 0xfn);
const expectedDigits = [0, 7, 7, 0, 7, 7, 7, 7];
for (let i = 0; i < 8; i++)
  check(`digit[${i}]`, digitAt(packedDigits, i), expectedDigits[i]);

const scoreAt = (packed: bigint, i: number) =>
  Number((packed >> BigInt(248 - i * 8)) & 0xffn);
const expectedScores = [0, 17, 0, 20, 7, 0, 0, 7];
for (let i = 0; i < 8; i++)
  check(`score[${i}]`, scoreAt(packedScores, i), expectedScores[i]);

// ---- score changes ----
const scPayload = buildScoreChangesPayload(summary, GAME_ID);
const [rt1, scGameId, scTotal, scPacked] = decodeAbiParameters(
  SCORE_CHANGES_PARAMS,
  scPayload,
);
check("sc reportType", rt1, 1);
check("sc gameId", scGameId, GAME_ID);
check("sc total", scTotal, 5);
check("sc packed words", scPacked.length, 1);

// ---- week games (week 2 preseason 2026 = the contest 82 week) ----
const weekId = calculateWeekId(2026n, 1, 2);
const scoreboard = await fetchJson(
  `${ESPN_SCOREBOARD}?year=2026&seasontype=1&week=2`,
);
const wgPayload = buildWeekGamesPayload(scoreboard, weekId);
const [rt2, wgWeekId, wgCount, wgPacked] = decodeAbiParameters(
  WEEK_GAMES_PARAMS,
  wgPayload,
);
check("wg reportType", rt2, 2);
check("wg weekId", wgWeekId, weekId);
check("wg count > 0", wgCount > 0, true);
check("wg contains contest-82 game", wgPacked.some((w) => {
  for (const shift of [170n, 85n, 0n]) {
    if (((w >> shift) & ((1n << 85n) - 1n)) === GAME_ID) return true;
  }
  return false;
}), true);

// ---- week results ----
const wrPayload = await buildWeekResultsPayload(weekId, scoreboard, (id) =>
  fetchJson(`${ESPN_SUMMARY}?event=${id}`),
);
const [rt3, wrWeekId, allCompleted, wrCount, packedResults, tbPoints, tbGame] =
  decodeAbiParameters(WEEK_RESULTS_PARAMS, wrPayload);
check("wr reportType", rt3, 3);
check("wr weekId", wrWeekId, weekId);
check("wr allCompleted", allCompleted, 1n);
check("wr count", wrCount, wgCount);
check("wr tiebreaker points > 0", tbPoints > 0n, true);
check("wr tiebreaker game set", tbGame > 0n, true);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
