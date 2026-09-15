/**
 * One-shot: set the reporter wallet's ENS primary name on Ethereum mainnet.
 *
 * bankrball.eth was registered with the reporter as owner, but only the
 * reporter itself can set its reverse record, and its key lives only here.
 * Once the name reads back correctly this marks itself done in Redis and
 * stops touching L1.
 */
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

import { redis } from "@/lib/redis";

import { getReporterAccount } from "./chain";
import type { SyncResult } from "./sync";

const PRIMARY_NAME = "bankrball.eth";
const REVERSE_REGISTRAR = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb";
const DONE_KEY = `ens-primary:done:${PRIMARY_NAME}`;
const LOCK_KEY = `ens-primary:lock:${PRIMARY_NAME}`;

const transport = () =>
  http(process.env.ORACLE_L1_RPC_URL || undefined, {
    retryCount: 3,
    retryDelay: 2000,
    timeout: 30_000,
  });

export async function syncEnsPrimaryName(result: SyncResult): Promise<void> {
  if (!redis) return;
  if (await redis.get(DONE_KEY)) return;

  const account = getReporterAccount();
  const l1 = createPublicClient({ chain: mainnet, transport: transport() });

  if ((await l1.getEnsName({ address: account.address })) === PRIMARY_NAME) {
    await redis.set(DONE_KEY, "1");
    result.skips.push(`ensPrimary:${PRIMARY_NAME}:set`);
    return;
  }
  // Never claim a name that doesn't point back at us.
  const forward = await l1.getEnsAddress({ name: PRIMARY_NAME });
  if (forward?.toLowerCase() !== account.address.toLowerCase()) {
    result.skips.push(`ensPrimary:${PRIMARY_NAME}:forward-mismatch`);
    return;
  }
  if ((await l1.getBalance({ address: account.address })) === 0n) {
    result.skips.push(`ensPrimary:${PRIMARY_NAME}:no-l1-gas`);
    return;
  }
  // A sent-but-unconfirmed tx must not be repeated by the next run.
  const locked = await redis.set(LOCK_KEY, "1", { nx: true, ex: 60 * 60 });
  if (locked !== "OK") {
    result.skips.push(`ensPrimary:${PRIMARY_NAME}:in-flight`);
    return;
  }

  const wallet = createWalletClient({
    account,
    chain: mainnet,
    transport: transport(),
  });
  const { request } = await l1.simulateContract({
    address: REVERSE_REGISTRAR,
    abi: parseAbi(["function setName(string name) returns (bytes32)"]),
    functionName: "setName",
    args: [PRIMARY_NAME],
    account,
  });
  const tx = await wallet.writeContract(request);
  result.writes.push({ kind: "ensPrimaryName", ref: PRIMARY_NAME, tx });
  const receipt = await l1.waitForTransactionReceipt({ hash: tx });
  if (receipt.status === "success") await redis.set(DONE_KEY, "1");
}
