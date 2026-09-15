/**
 * One-shot: set the reporter wallet's ENS primary name on Ethereum mainnet.
 *
 * bankrball.eth was registered with the reporter as owner, but only the
 * reporter itself can set its reverse record, and its key lives only here.
 * Once the name reads back correctly this marks itself done in Redis and
 * stops touching L1.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  parseAbi,
  zeroAddress,
} from "viem";
import { mainnet } from "viem/chains";

import { redis } from "@/lib/redis";

import { getReporterAccount } from "./chain";
import type { SyncResult } from "./sync";

const PRIMARY_NAME = "bankrball.eth";
const REVERSE_REGISTRAR = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb";
const DONE_KEY = `ens-primary:done:${PRIMARY_NAME}`;
const LOCK_KEY = `ens-primary:lock:${PRIMARY_NAME}`;

// Same keyed thirdweb RPC the Base client uses; viem's default public
// mainnet endpoint isn't reliable from serverless.
const l1RpcUrl =
  process.env.ORACLE_L1_RPC_URL ||
  (process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID
    ? `https://${mainnet.id}.rpc.thirdweb.com/${process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}`
    : undefined);

const transport = () =>
  http(l1RpcUrl, {
    retryCount: 3,
    retryDelay: 2000,
    timeout: 30_000,
  });

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const registryAbi = parseAbi([
  "function resolver(bytes32 node) view returns (address)",
]);
const resolverAbi = parseAbi([
  "function name(bytes32 node) view returns (string)",
  "function addr(bytes32 node) view returns (address)",
]);

// Read records straight from the registry + resolver rather than through the
// Universal Resolver, which reverts (instead of returning null) for an
// address with no reverse record.
async function readRecord(
  l1: ReturnType<typeof createPublicClient>,
  node: `0x${string}`,
  functionName: "name" | "addr",
): Promise<string | null> {
  const resolver = await l1.readContract({
    address: ENS_REGISTRY,
    abi: registryAbi,
    functionName: "resolver",
    args: [node],
  });
  if (resolver === zeroAddress) return null;
  return (await l1.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName,
    args: [node],
  })) as string;
}

export async function syncEnsPrimaryName(result: SyncResult): Promise<void> {
  if (!redis) return;
  if (await redis.get(DONE_KEY)) return;

  const account = getReporterAccount();
  const l1 = createPublicClient({ chain: mainnet, transport: transport() });
  const reverseNode = namehash(
    `${account.address.slice(2).toLowerCase()}.addr.reverse`,
  );

  if ((await readRecord(l1, reverseNode, "name")) === PRIMARY_NAME) {
    await redis.set(DONE_KEY, "1");
    result.skips.push(`ensPrimary:${PRIMARY_NAME}:set`);
    return;
  }
  // Never claim a name that doesn't point back at us.
  const forward = await readRecord(l1, namehash(PRIMARY_NAME), "addr");
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

  let tx: `0x${string}`;
  try {
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
    tx = await wallet.writeContract(request);
  } catch (e) {
    // Nothing was broadcast, so the next run may try again.
    await redis.del(LOCK_KEY);
    throw e;
  }
  result.writes.push({ kind: "ensPrimaryName", ref: PRIMARY_NAME, tx });
  const receipt = await l1.waitForTransactionReceipt({ hash: tx });
  if (receipt.status === "success") await redis.set(DONE_KEY, "1");
}
