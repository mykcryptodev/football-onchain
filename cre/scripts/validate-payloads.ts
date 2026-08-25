/**
 * Live-data harness: runs the pure payload builders against real ESPN data and
 * decodes the results — proving the encode side matches what CREScoreOracle.sol
 * decodes (contract-side decode already proven by Foundry tests).
 *
 * Run: bun run scripts/validate-payloads.ts
 */
import { decodeAbiParameters } from "viem"
import {
  ESPN_SUMMARY,
  ESPN_SCOREBOARD,
  GAME_SCORES_PARAMS,
  SCORE_CHANGES_PARAMS,
  WEEK_GAMES_PARAMS,
  WEEK_RESULTS_PARAMS,
  buildGameScoresPayload,
  buildScoreChangesPayload,
  buildWeekGamesPayload,
  buildWeekResultsPayload,
  fetchJson,
  calculateWeekId,
} from "../workflow/espn"

const GAME_ID = 401873277n // WSH 20 @ MIA 7, final (the contest 82 game)

let failures = 0
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? "✓" : "✗"} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`)
}

// ---- game scores ----
const summary = await fetchJson(`${ESPN_SUMMARY}?event=${GAME_ID}`)
const gsPayload = buildGameScoresPayload(summary, GAME_ID)
const [rt0, gameId, qComplete, gameCompleted, totalScoreChanges, packedScores, packedDigits] =
  decodeAbiParameters(GAME_SCORES_PARAMS, gsPayload)

check("reportType", rt0, 0)
check("gameId", gameId, GAME_ID)
check("qComplete (final game)", qComplete, 100)
check("gameCompleted", gameCompleted, true)

const dig = (shift: number) => Number((packedDigits >> BigInt(shift)) & 0xfn)
const scr = (shift: number) => Number((packedScores >> BigInt(shift)) & 0xffn)
// MIA 7 @ WSH 20 (WSH home) — verify against known final
check("homeF (WSH)", scr(224), 20)
check("awayF (MIA)", scr(192), 7)
check("homeF digit", dig(240), 0)
check("awayF digit", dig(224), 7)
console.log(`  quarter digits home: ${dig(252)}${dig(248)}${dig(244)}${dig(240)} away: ${dig(236)}${dig(232)}${dig(228)}${dig(224)}`)
console.log(`  quarter scores home: ${scr(248)},${scr(240)},${scr(232)},${scr(224)} away: ${scr(216)},${scr(208)},${scr(200)},${scr(192)}`)

// ---- score changes ----
const scPayload = buildScoreChangesPayload(summary, GAME_ID)
const [rt1, , scCount, scPacked] = decodeAbiParameters(SCORE_CHANGES_PARAMS, scPayload)
check("reportType", rt1, 1)
check("score change count matches totalScoreChanges", scCount, totalScoreChanges)
console.log(`  ${scCount} scoring plays packed into ${scPacked.length} word(s)`)
const c0 = Number(scPacked[0] & 0xffffffffn)
check("first score change away digit (MIA scored first, 0-7)", c0 & 0xf, 7)
check("first score change home digit", (c0 >> 4) & 0xf, 0)

// ---- week games (preseason week 2, 2026) ----
const weekId = calculateWeekId(2026n, 1, 2)
const scoreboard = await fetchJson(`${ESPN_SCOREBOARD}?dates=2026&seasontype=1&week=2`)
const wgPayload = buildWeekGamesPayload(scoreboard, weekId)
const [rt2, , gameCount, packedIds] = decodeAbiParameters(WEEK_GAMES_PARAMS, wgPayload)
check("reportType", rt2, 2)
console.log(`  ${gameCount} games in week, packed into ${packedIds.length} word(s)`)
const unpacked: bigint[] = []
for (const w of packedIds) {
  for (const shift of [170n, 85n, 0n]) {
    const id = (w >> shift) & ((1n << 85n) - 1n)
    if (id > 0n && unpacked.length < Number(gameCount)) unpacked.push(id)
  }
}
check("game 401873277 present in week games", unpacked.includes(GAME_ID), true)

// ---- week results ----
const wrPayload = await buildWeekResultsPayload(weekId, scoreboard, async (id) => fetchJson(`${ESPN_SUMMARY}?event=${id}`))
const [rt3, , allCompleted, wrCount, packedResults, tiebreakerPoints, tiebreakerGameId] =
  decodeAbiParameters(WEEK_RESULTS_PARAMS, wrPayload)
check("reportType", rt3, 3)
check("allCompleted (week finished Aug 16)", allCompleted, 1n)
check("gameCount consistent", wrCount, gameCount)
const miaIdx = unpacked.indexOf(GAME_ID)
check("WSH home win -> winner bit 1", (packedResults >> BigInt(miaIdx)) & 1n, 1n)
console.log(`  tiebreaker: game ${tiebreakerGameId}, total points ${tiebreakerPoints}`)

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`)
process.exit(failures === 0 ? 0 : 1)
