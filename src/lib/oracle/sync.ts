/**
 * Core oracle sync logic, shared by the cron route and the webhook fulfill route.
 *
 * Gas discipline: only writes when (a) an active contest depends on the data,
 * or (b) week games are missing and users need them to create contests.
 * All writes are delta-checked against onchain state before submitting.
 */
import type { Hex } from "viem";

import { chain as appChain, contests, pickem } from "@/constants";
import { abi as contestsAbi } from "@/constants/abis/contests";
import { abi as pickemAbi } from "@/constants/abis/pickem";

import {
  publicClient,
  readGameScore,
  readScoreChangesAvailable,
  readWeekGamesFinalized,
  readWeekResultsFinalized,
  writeReport,
} from "./chain";
import { notifyError } from "./discord";
import {
  buildGameScoresPayload,
  buildScoreChangesPayload,
  buildWeekGamesPayload,
  buildWeekResultsPayload,
  calculateWeekId,
  fetchGameSummary,
  fetchWeekScoreboard,
} from "./espn";

const contestsAddress = contests[
  appChain.id as keyof typeof contests
] as `0x${string}`;
const pickemAddress = pickem[
  appChain.id as keyof typeof pickem
] as `0x${string}`;

export interface SyncResult {
  writes: { kind: string; ref: string; tx: Hex }[];
  skips: string[];
  errors: string[];
}

// ---------- active contest discovery ----------

interface ActiveGames {
  gameIds: Set<bigint>;
  weeks: Set<bigint>; // weekIds with undistributed pickem contests
}

async function findActiveGames(): Promise<ActiveGames> {
  const gameIds = new Set<bigint>();
  const weeks = new Set<bigint>();

  // Squares contests: id, gameId, payoutsPaid.totalPayoutsMade
  const contestCount = (await publicClient.readContract({
    address: contestsAddress,
    abi: contestsAbi,
    functionName: "contestIdCounter",
  })) as bigint;

  const squaresReads = [];
  for (let id = 1n; id < contestCount; id++) {
    squaresReads.push({
      address: contestsAddress,
      abi: contestsAbi,
      functionName: "getContestData",
      args: [id],
    } as const);
  }
  if (squaresReads.length > 0) {
    const results = await publicClient.multicall({
      contracts: squaresReads,
      allowFailure: true,
    });
    for (const r of results) {
      if (r.status !== "success") continue;
      const data = r.result as {
        gameId: bigint;
        payoutsPaid: { totalPayoutsMade: bigint };
      };
      if (data.payoutsPaid.totalPayoutsMade === 0n) gameIds.add(data.gameId);
    }
  }

  // Pickem contests: gameIds + week, payoutComplete flag
  const pickemCount = (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "nextContestId",
  })) as bigint;

  const pickemReads = [];
  for (let id = 1n; id < pickemCount; id++) {
    pickemReads.push({
      address: pickemAddress,
      abi: pickemAbi,
      functionName: "getContest",
      args: [id],
    } as const);
  }
  if (pickemReads.length > 0) {
    const results = await publicClient.multicall({
      contracts: pickemReads,
      allowFailure: true,
    });
    for (const r of results) {
      if (r.status !== "success") continue;
      const c = r.result as unknown as {
        seasonType: number;
        weekNumber: number;
        year: bigint;
        gameIds: readonly bigint[];
        payoutComplete: boolean;
      };
      if (c.payoutComplete) continue;
      for (const g of c.gameIds) gameIds.add(g);
      weeks.add(calculateWeekId(c.year, c.seasonType, c.weekNumber));
    }
  }

  return { gameIds, weeks };
}

// ---------- individual writers (delta-checked) ----------

export async function syncGameScore(
  gameId: bigint,
  result: SyncResult,
): Promise<void> {
  let onchain: Awaited<ReturnType<typeof readGameScore>>;
  let espn: Awaited<ReturnType<typeof fetchGameSummary>>;
  try {
    [onchain, espn] = await Promise.all([
      readGameScore(gameId),
      fetchGameSummary(gameId),
    ]);
  } catch (e) {
    // Junk gameIds (bad contest data) 404 on ESPN — skip quietly, don't alert.
    if ((e as Error).message.includes("ESPN HTTP 404")) {
      result.skips.push(`scores:${gameId}:no-espn-game`);
      return;
    }
    throw e;
  }
  if (!espn?.header?.competitions?.length) {
    result.skips.push(`scores:${gameId}:no-espn-game`);
    return;
  }
  const payload = buildGameScoresPayload(espn, gameId);

  // Decode the fresh payload's packed values to compare against onchain.
  // Layout: (uint8, uint256, uint8, bool, uint8, uint256, uint256)
  const { decodeAbiParameters, parseAbiParameters } = await import("viem");
  const decoded = decodeAbiParameters(
    parseAbiParameters(
      "uint8, uint256, uint8, bool, uint8, uint256, uint256",
    ),
    payload,
  );
  const [, , qComplete, gameCompleted, , packedScores, packedDigits] = decoded;

  const unchanged =
    onchain.qComplete === Number(qComplete) &&
    onchain.gameCompleted === gameCompleted &&
    onchain.packedQuarterScores === packedScores &&
    onchain.packedQuarterDigits === packedDigits;

  // Gas-drain guard: game over and final already onchain → never write again.
  if (unchanged || (onchain.gameCompleted && gameCompleted)) {
    result.skips.push(`scores:${gameId}`);
    return;
  }

  const tx = await writeReport(payload);
  result.writes.push({ kind: "scores", ref: gameId.toString(), tx });

  // Score changes ride along once the game is final and not yet stored.
  if (gameCompleted && !(await readScoreChangesAvailable(gameId))) {
    await syncScoreChanges(gameId, result);
  }
}

export async function syncScoreChanges(
  gameId: bigint,
  result: SyncResult,
): Promise<void> {
  if (await readScoreChangesAvailable(gameId)) {
    result.skips.push(`scoreChanges:${gameId}`);
    return;
  }
  const espn = await fetchGameSummary(gameId);
  const payload = buildScoreChangesPayload(espn, gameId);
  const tx = await writeReport(payload);
  result.writes.push({ kind: "scoreChanges", ref: gameId.toString(), tx });
}

export async function syncWeekGames(
  weekId: bigint,
  result: SyncResult,
): Promise<void> {
  if (await readWeekGamesFinalized(weekId)) {
    result.skips.push(`weekGames:${weekId}`);
    return;
  }
  const year = weekId >> 16n;
  const seasonType = Number((weekId >> 8n) & 0xffn);
  const weekNumber = Number(weekId & 0xffn);
  const scoreboard = await fetchWeekScoreboard(year, seasonType, weekNumber);
  if (!scoreboard?.events?.length) {
    result.skips.push(`weekGames:${weekId}:no-espn-events`);
    return;
  }
  const payload = buildWeekGamesPayload(scoreboard, weekId);
  const tx = await writeReport(payload);
  result.writes.push({ kind: "weekGames", ref: weekId.toString(), tx });
}

export async function syncWeekResults(
  weekId: bigint,
  result: SyncResult,
): Promise<void> {
  if (await readWeekResultsFinalized(weekId)) {
    result.skips.push(`weekResults:${weekId}`);
    return;
  }
  const year = weekId >> 16n;
  const seasonType = Number((weekId >> 8n) & 0xffn);
  const weekNumber = Number(weekId & 0xffn);
  const scoreboard = await fetchWeekScoreboard(year, seasonType, weekNumber);
  if (!scoreboard?.events?.length) {
    result.skips.push(`weekResults:${weekId}:no-espn-events`);
    return;
  }
  const payload = await buildWeekResultsPayload(
    weekId,
    scoreboard,
    fetchGameSummary,
  );
  const tx = await writeReport(payload);
  result.writes.push({ kind: "weekResults", ref: weekId.toString(), tx });
}

// ---------- full sync (cron entry point) ----------

export async function runFullSync(): Promise<SyncResult> {
  const result: SyncResult = { writes: [], skips: [], errors: [] };

  let active: ActiveGames;
  try {
    active = await findActiveGames();
  } catch (e) {
    const msg = `contest discovery failed: ${(e as Error).message}`;
    result.errors.push(msg);
    await notifyError(msg);
    return result;
  }

  // Note: weekGames are NOT proactively written by the cron. The UI already
  // has a button (fetchWeekGames) for users to request a week's games before
  // creating a contest — those arrive via the webhook fulfill path. This keeps
  // the cron fully contest-gated: no active contests → zero gas.

  // Scores for games with active contests.
  for (const gameId of active.gameIds) {
    try {
      await syncGameScore(gameId, result);
    } catch (e) {
      const msg = `scores sync failed for ${gameId}: ${(e as Error).message}`;
      result.errors.push(msg);
      await notifyError(msg);
    }
  }

  // Week results for weeks with undistributed pickem contests.
  for (const weekId of active.weeks) {
    try {
      await syncWeekResults(weekId, result);
    } catch (e) {
      const msg = `week results sync failed for ${weekId}: ${(e as Error).message}`;
      result.errors.push(msg);
      await notifyError(msg);
    }
  }

  return result;
}
