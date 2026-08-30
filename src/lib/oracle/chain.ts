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
  // Tolerate a missing 0x prefix — viem requires it and a bare hex key
  // fails every write with "invalid private key".
  return privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex,
  );
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

export async function readGameScore(
  gameId: bigint,
): Promise<OnchainGameScore> {
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

export async function writeReport(report: Hex): Promise<Hex> {
  await assertGasPriceUnderCap();
  const { account, client } = getWriterClient();
  const { request } = await publicClient.simulateContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "onReport",
    args: ["0x", report],
    account,
  });
  const hash = await client.writeContract(request);
  // Public RPCs can lag on tx propagation — viem's default receipt wait
  // (~1 block) gives up with "receipt could not be found" / timeout even
  // though the tx lands fine a few seconds later. Wait generously; the
  // next sync tick's delta-check makes any real miss self-healing anyway.
  await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 120_000,
    pollingInterval: 4_000,
    retryCount: 5,
    retryDelay: 3_000,
  });
  return hash;
}
