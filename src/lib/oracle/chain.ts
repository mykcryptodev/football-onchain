/**
 * Onchain access for the self-hosted oracle writer.
 * Reads use a public client; writes use the reporter wallet (ORACLE_REPORTER_PRIVATE_KEY).
 */
import {
  type Address,
  createPublicClient,
  createWalletClient,
  type Hex,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { chain as appChain, gameScoreOracle } from "@/constants";

import { CRE_ORACLE_ABI } from "./abi";

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
  const r = (await publicClient.readContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "weekGames",
    args: [weekId],
  })) as unknown as [number, number, bigint, bigint[], number, boolean];
  return r[5];
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

export async function writeReport(report: Hex): Promise<Hex> {
  const { account, client } = getWriterClient();
  const { request } = await publicClient.simulateContract({
    address: oracleAddress,
    abi: CRE_ORACLE_ABI,
    functionName: "onReport",
    args: ["0x", report],
    account,
  });
  const hash = await client.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
