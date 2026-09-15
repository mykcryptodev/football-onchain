/**
 * Settles the featured Pick'em contest (and any earlier ones the reporter
 * created) and creates the next week's one.
 *
 * Runs inside the oracle sync cron. Every step reads chain state first and is
 * a no-op once done, so running every 5 minutes is safe:
 *   1. week results finalized          → updateContestResults
 *   2. entries without a score         → calculateScoresBatch
 *   3. payout period started           → claimAllPrizes
 *   4. next week has no featured contest → write its slate, then createContest
 *
 * Step 4 only ever targets the featured contest's week + 1. Moving on to the
 * week after that requires featuredPickemContestOfWeekId to be updated.
 */
import type { Address } from "viem";

import {
  chain as appChain,
  featuredPickemContestOfWeekId,
  pickem,
  usdc,
} from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { redis } from "@/lib/redis";

import {
  getReporterAccount,
  publicClient,
  readWeekGameIds,
  readWeekResultsFinalized,
  writeAsReporter,
} from "./chain";
import { notifyError } from "./discord";
import {
  calculateWeekId,
  type EspnScoreboard,
  extractSortedGameIds,
  fetchWeekScoreboard,
  weekGamesMismatched,
} from "./espn";
import type { SyncResult } from "./sync";

const pickemAddress = pickem[appChain.id as keyof typeof pickem] as Address;
const usdcAddress = usdc[appChain.id as keyof typeof usdc] as Address;

// Featured contest settings: 1 USDC entry, winner take all.
const FEATURED_ENTRY_FEE = 1_000_000n;
const FEATURED_PAYOUT_TYPE = 0;
const REGULAR_SEASON = 2;
const LAST_REGULAR_SEASON_WEEK = 18;
const SCORE_BATCH_SIZE = 100;
// Refuse to create a contest whose entry window would be shorter than this.
const MIN_ENTRY_WINDOW_SECONDS = 60 * 60;
// How far back from the newest contest to look for one we already created.
const EXISTING_CONTEST_SCAN = 50n;

interface Contest {
  id: bigint;
  creator: Address;
  seasonType: number;
  weekNumber: number;
  year: bigint;
  gameIds: readonly bigint[];
  gamesFinalized: boolean;
  payoutComplete: boolean;
  payoutDeadline: bigint;
}

type SyncWeekGames = (weekId: bigint, result: SyncResult) => Promise<void>;

// ---------- pure helpers (unit tested) ----------

/** The only week the automation may create a contest for, or null. */
export const nextFeaturedWeek = (
  featured: Pick<Contest, "seasonType" | "weekNumber" | "year">,
): { year: bigint; seasonType: number; weekNumber: number } | null => {
  if (featured.seasonType !== REGULAR_SEASON) return null;
  if (featured.weekNumber >= LAST_REGULAR_SEASON_WEEK) return null;
  return {
    year: featured.year,
    seasonType: REGULAR_SEASON,
    weekNumber: featured.weekNumber + 1,
  };
};

/** Earliest kickoff on the scoreboard, in unix seconds, or null. */
export const firstKickoff = (scoreboard: EspnScoreboard): bigint | null => {
  let earliest: number | null = null;
  for (const e of scoreboard.events || []) {
    const t = Date.parse(e.date);
    if (Number.isFinite(t) && (earliest === null || t < earliest)) earliest = t;
  }
  return earliest === null ? null : BigInt(Math.floor(earliest / 1000));
};

/** Pickem pairs winner bit i with gameIds[i], so order must match exactly. */
export const sameGameOrder = (
  a: readonly bigint[],
  b: readonly bigint[],
): boolean => a.length === b.length && a.every((id, i) => id === b[i]);

// ---------- reads ----------

async function readContest(id: bigint): Promise<Contest> {
  return (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "getContest",
    args: [id],
  })) as unknown as Contest;
}

// Alert once per key instead of every 5-minute run.
async function alertOnce(
  key: string,
  message: string,
  result: SyncResult,
): Promise<void> {
  result.errors.push(message);
  const first = redis
    ? (await redis.set(`featured-pickem:alert:${key}`, "1", {
        nx: true,
        ex: 7 * 24 * 60 * 60,
      })) === "OK"
    : true;
  if (first) await notifyError(message);
}

// ---------- steps ----------

async function finalizeResults(c: Contest, result: SyncResult): Promise<void> {
  const weekId = calculateWeekId(c.year, c.seasonType, c.weekNumber);
  if (!(await readWeekResultsFinalized(weekId))) {
    result.skips.push(`featured:${c.id}:results-not-final`);
    return;
  }
  // Same length but different order would silently pay the wrong entries.
  const oracleIds = await readWeekGameIds(weekId);
  if (!sameGameOrder(c.gameIds, oracleIds)) {
    await alertOnce(
      `order-mismatch:${c.id}`,
      `featured contest ${c.id} not finalized — its game ids don't match the oracle's week ${weekId} list. Resolve manually.`,
      result,
    );
    return;
  }
  const tx = await writeAsReporter({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "updateContestResults",
    args: [c.id],
  });
  result.writes.push({ kind: "pickemFinalize", ref: c.id.toString(), tx });
}

/** Scores every entry. Returns how many were still unscored before this run. */
async function scoreEntries(c: Contest, result: SyncResult): Promise<number> {
  const tokenIds = (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "getContestTokenIds",
    args: [c.id],
  })) as readonly bigint[];
  if (tokenIds.length === 0) return 0;

  const predictions = await publicClient.multicall({
    contracts: tokenIds.map(
      tokenId =>
        ({
          address: pickemAddress,
          abi: pickemAbi,
          functionName: "getUserPrediction",
          args: [tokenId],
        }) as const,
    ),
    allowFailure: false,
  });
  // getUserPrediction: (contestId, predictor, submissionTime,
  // tiebreakerPoints, correctPicks, scoreCalculated, claimed)
  const unscored = tokenIds.filter(
    (_, i) => !(predictions[i] as unknown as readonly unknown[])[5],
  );
  if (unscored.length === 0) {
    result.skips.push(`featured:${c.id}:scores-done`);
    return 0;
  }

  for (let i = 0; i < unscored.length; i += SCORE_BATCH_SIZE) {
    const batch = unscored.slice(i, i + SCORE_BATCH_SIZE);
    const tx = await writeAsReporter({
      address: pickemAddress,
      abi: pickemAbi,
      functionName: "calculateScoresBatch",
      args: [batch],
    });
    result.writes.push({
      kind: "pickemScores",
      ref: `${c.id}:${batch.length}`,
      tx,
    });
  }
  return unscored.length;
}

async function payout(c: Contest, result: SyncResult): Promise<void> {
  if (c.payoutComplete) {
    result.skips.push(`featured:${c.id}:paid`);
    return;
  }
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now < c.payoutDeadline) {
    result.skips.push(`featured:${c.id}:payout-at-${c.payoutDeadline}`);
    return;
  }
  const leaderboard = (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "getContestLeaderboard",
    args: [c.id],
  })) as readonly unknown[];
  if (leaderboard.length === 0) {
    result.skips.push(`featured:${c.id}:no-leaderboard`);
    return;
  }
  const tx = await writeAsReporter({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "claimAllPrizes",
    args: [c.id],
  });
  result.writes.push({ kind: "pickemPayout", ref: c.id.toString(), tx });
}

async function createNext(
  featured: Contest,
  result: SyncResult,
  syncWeekGames: SyncWeekGames,
): Promise<void> {
  const target = nextFeaturedWeek(featured);
  if (!target) {
    result.skips.push(`featured:${featured.id}:no-next-week`);
    return;
  }
  const label = `${target.year}-w${target.weekNumber}`;
  const reporter = getReporterAccount().address.toLowerCase();

  // Already created (e.g. the featured id hasn't been rotated yet)?
  const nextContestId = (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "nextContestId",
  })) as bigint;
  const floor =
    nextContestId > EXISTING_CONTEST_SCAN
      ? nextContestId - EXISTING_CONTEST_SCAN
      : 0n;
  for (let id = nextContestId - 1n; id > featured.id && id >= floor; id--) {
    const c = await readContest(id);
    if (
      c.creator.toLowerCase() === reporter &&
      c.year === target.year &&
      c.seasonType === target.seasonType &&
      c.weekNumber === target.weekNumber
    ) {
      result.skips.push(`featured:next:${label}:exists:${id}`);
      return;
    }
  }

  const weekId = calculateWeekId(
    target.year,
    target.seasonType,
    target.weekNumber,
  );
  const scoreboard = await fetchWeekScoreboard(
    target.year,
    target.seasonType,
    target.weekNumber,
  );
  if (!scoreboard?.events?.length) {
    result.skips.push(`featured:next:${label}:no-espn-events`);
    return;
  }

  // createContest snapshots the oracle's slate, so it must match ESPN first.
  // Create on a later run so the new slate is visible to every RPC node.
  const oracleIds = await readWeekGameIds(weekId);
  if (weekGamesMismatched(extractSortedGameIds(scoreboard), oracleIds)) {
    await syncWeekGames(weekId, result);
    result.skips.push(`featured:next:${label}:slate-written`);
    return;
  }

  const deadline = firstKickoff(scoreboard);
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (!deadline || deadline < now + BigInt(MIN_ENTRY_WINDOW_SECONDS)) {
    await alertOnce(
      `too-late:${label}`,
      `featured contest for ${label} not created — first kickoff ${deadline ?? "unknown"} is under an hour away or past.`,
      result,
    );
    return;
  }

  const tx = await writeAsReporter({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "createContest",
    args: [
      target.seasonType,
      target.weekNumber,
      target.year,
      usdcAddress,
      FEATURED_ENTRY_FEE,
      FEATURED_PAYOUT_TYPE,
      deadline,
    ],
  });
  result.writes.push({ kind: "pickemCreate", ref: label, tx });
}

// ---------- entry point ----------

async function step(
  name: string,
  result: SyncResult,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const msg = `featured pickem ${name} failed: ${(e as Error).message}`;
    result.errors.push(msg);
    await notifyError(msg);
  }
}

/**
 * Contests the cron settles: the featured one plus every unpaid contest the
 * reporter wallet created. Rotating the featured id to next week's contest
 * must not strand the previous week's payout.
 */
async function contestsToSettle(featuredId: bigint): Promise<Contest[]> {
  const reporter = getReporterAccount().address.toLowerCase();
  const nextContestId = (await publicClient.readContract({
    address: pickemAddress,
    abi: pickemAbi,
    functionName: "nextContestId",
  })) as bigint;
  const ids: bigint[] = [];
  for (let id = 1n; id < nextContestId; id++) ids.push(id);
  const results = await publicClient.multicall({
    contracts: ids.map(
      id =>
        ({
          address: pickemAddress,
          abi: pickemAbi,
          functionName: "getContest",
          args: [id],
        }) as const,
    ),
    allowFailure: false,
  });
  return (results as unknown as Contest[]).filter(
    c =>
      c.id === featuredId ||
      (c.creator.toLowerCase() === reporter && !c.payoutComplete),
  );
}

async function settle(c: Contest, result: SyncResult): Promise<void> {
  if (!c.gamesFinalized) {
    // Scoring and payout wait for a finalized week; the next run picks them
    // up once this write is visible.
    await step(`finalize ${c.id}`, result, () => finalizeResults(c, result));
    return;
  }
  let unscored = -1; // stays -1 if scoring failed, which blocks payout
  await step(`scores ${c.id}`, result, async () => {
    unscored = await scoreEntries(c, result);
  });
  // Pay out only once a run has seen every entry already scored, so the
  // leaderboard is complete.
  if (unscored === 0) {
    await step(`payout ${c.id}`, result, () => payout(c, result));
  }
}

export async function syncFeaturedPickem(
  result: SyncResult,
  syncWeekGames: SyncWeekGames,
): Promise<void> {
  if (featuredPickemContestOfWeekId === null) {
    result.skips.push("featured:none");
    return;
  }
  const featuredId = BigInt(featuredPickemContestOfWeekId);
  const contests = await contestsToSettle(featuredId);
  for (const c of contests) await settle(c, result);

  // Next week's contest is created only once the featured week is finalized.
  const featured = contests.find(c => c.id === featuredId);
  if (!featured?.gamesFinalized) return;
  await step("create next", result, () =>
    createNext(featured, result, syncWeekGames),
  );
}
