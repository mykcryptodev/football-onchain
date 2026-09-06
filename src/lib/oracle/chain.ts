/**
 * Onchain access for the self-hosted oracle writer.
 * Reads use a public client; writes use the reporter wallet (ORACLE_REPORTER_PRIVATE_KEY).
 */
import {
  type Address,
  createPublicClient,
  createWalletClient,
  formatGwei,
  type Hex,
  http,
  parseGwei,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { chain as appChain, gameScoreOracle } from "@/constants";
import { redis } from "@/lib/redis";

import { CRE_ORACLE_ABI } from "./abi";
import { weekIdToParams } from "./espn";

export const oracleAddress = gameScoreOracle[
  appChain.id as keyof typeof gameScoreOracle
] as Address;

// Default to the thirdweb RPC keyed by our client ID — the public Base RPC
// rate-limits aggressively. ORACLE_RPC_URL overrides (e.g. a dedicated
// Alchemy/QuickNode endpoint) when set.
const rpcUrl =
  process.env.ORACLE_RPC_URL ||
  (process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
    ? `https://${base.id}.rpc.thirdweb.com/${process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}`
    : undefined);

// Back off instead of failing the sync on transient RPC errors.
const transport = () =>
  http(rpcUrl, { retryCount: 5, retryDelay: 2000, timeout: 30_000 });

export const publicClient = createPublicClient({
  chain: base,
  transport: transport(),
});

export function getReporterAccount() {
  const pk = process.env.ORACLE_REPORTER_PRIVATE_KEY;
  if (!pk) throw new Error("ORACLE_REPORTER_PRIVATE_KEY is not set");
  return privateKeyToAccount(pk as Hex);
}

export function getWriterClient() {
  const account = getReporterAccount();
  return {
    account,
    client: createWalletClient({
      account,
      chain: base,
      transport: transport(),
    }),
  };
}

// ---------- oracle reads ----------

export interface OnchainGameScore {
  qComplete: number;
  gameCompleted: boolean;
  packedQuarterScores: bigint;
  packedQuarterDigits: bigint;
  totalScoreChanges: number;
}

export async function readGameScore(gameId: bigint): Promise<OnchainGameScore> {
  const r = (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "gameScores",
    args: [gameId],
  })) as [bigint, number, boolean, boolean, bigint, bigint, number];
  return {
    qComplete: r[1],
    gameCompleted: r[3],
    packedQuarterScores: r[4],
    packedQuarterDigits: r[5],
    totalScoreChanges: r[6],
  };
}

export async function readScoreChangesAvailable(
  gameId: bigint,
): Promise<boolean> {
  return (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "areScoreChangesAvailable",
    args: [gameId],
  })) as boolean;
}

export async function readWeekGamesFinalized(weekId: bigint): Promise<boolean> {
  // Solidity's auto-getter omits the struct's dynamic array member, so
  // weekGames() returns 5 values, not 6: (seasonType, weekNumber, year,
  // gamesCount, isFinalized). packedGameIds is not in the tuple.
  const r = (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "weekGames",
    args: [weekId],
  })) as unknown as [number, number, bigint, number, boolean];
  return r[4];
}

/**
 * The finalized game id list for a week, in the exact order the oracle stored
 * it. This is the order Pickem indexes packedResults against, so week results
 * must be built against this list rather than a fresh ESPN ordering.
 * Returns [] when weekGames has not been written for the week yet.
 */
export async function readWeekGameIds(weekId: bigint): Promise<bigint[]> {
  const { year, seasonType, weekNumber } = weekIdToParams(weekId);
  const [gameIds] = (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "getWeekGames",
    args: [year, seasonType, weekNumber],
  })) as unknown as [readonly bigint[], bigint];
  return [...gameIds];
}

export async function readWeekResultsFinalized(
  weekId: bigint,
): Promise<boolean> {
  const r = (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "weekResults",
    args: [weekId],
  })) as [bigint, bigint, number, boolean, bigint, bigint];
  return r[3];
}

// ---------- oracle write ----------

// Optional ceiling on what we'll pay per write. Unset = no cap (viem/RPC
// default fee estimation, uncapped). Checked against the network's current
// maxFeePerGas — the same figure viem would otherwise fill in unsupervised.
async function assertGasPriceUnderCap(): Promise<void> {
  const capGwei = process.env.ORACLE_MAX_GAS_PRICE_GWEI;
  if (!capGwei) return;
  const { maxFeePerGas } = await publicClient.estimateFeesPerGas();
  const capWei = parseGwei(capGwei);
  if (maxFeePerGas !== undefined && maxFeePerGas > capWei) {
    throw new Error(
      `network gas price ${formatGwei(maxFeePerGas)} gwei exceeds ORACLE_MAX_GAS_PRICE_GWEI cap (${capGwei} gwei) — write skipped`,
    );
  }
}

const WRITE_LOCK_KEY = `oracle:write-lock:${base.id}:${oracleAddress.toLowerCase()}`;
const WRITE_LOCK_TTL_SECONDS = 120;
const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

function isNonceTooLow(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /nonce too low|nonce provided.*lower than.*current nonce/i.test(
    message,
  );
}

async function submitReport(report: Hex): Promise<Hex> {
  await assertGasPriceUnderCap();
  const { account, client } = getWriterClient();
  const nonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  const { request } = await publicClient.simulateContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "onReport",
    args: ["0x", report],
    account,
    nonce,
  });
  const hash = await client.writeContract(request);
  // checkReplacement's replacement-detection path re-fetches the receipt by
  // hash after a transient "not found" and can rethrow that raw
  // TransactionReceiptNotFoundError instead of continuing to poll, which is
  // what surfaces as an uncaught sync failure when the RPC's replica lags
  // (thirdweb's Base endpoint is multi-node and not read-your-writes
  // consistent). We control the nonce ourselves under a Redis lock and never
  // speed up/cancel from a wallet, so replacement detection has nothing to
  // detect here — disable it and let the normal poll/timeout loop retry.
  await publicClient.waitForTransactionReceipt({
    hash,
    checkReplacement: false,
  });
  return hash;
}

export async function writeReport(report: Hex): Promise<Hex> {
  if (!redis) {
    throw new Error(
      "Redis is required for oracle writes so concurrent serverless invocations cannot reuse a nonce",
    );
  }

  const lockToken = crypto.randomUUID();
  const acquired = await redis.set(WRITE_LOCK_KEY, lockToken, {
    nx: true,
    ex: WRITE_LOCK_TTL_SECONDS,
  });
  if (acquired !== "OK") {
    throw new Error(
      "another oracle write is already in progress — retry later",
    );
  }

  try {
    try {
      return await submitReport(report);
    } catch (error) {
      if (!isNonceTooLow(error)) throw error;
      return await submitReport(report);
    }
  } finally {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, [WRITE_LOCK_KEY], [lockToken]);
    } catch (error) {
      console.error("Failed to release oracle write lock", error);
    }
  }
}
