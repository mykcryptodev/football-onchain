/**
 * Per EIP-5792, `wallet_getCapabilities` reports atomic batching support for a
 * chain as `{ atomic: { status: "supported" | "ready" | "unsupported" } }`.
 *
 * Only "supported" guarantees the wallet executes `wallet_sendCalls`
 * atomically right now. "ready" means the wallet would support it after an
 * upgrade step (e.g. EOA delegation) it hasn't taken yet, so calls sent today
 * may land as separate, non-atomic transactions — treating that as batchable
 * risks a partial submission (e.g. approval succeeds, entry doesn't).
 */
export function supportsAtomicBatch(capabilities: unknown): boolean {
  if (!capabilities || typeof capabilities !== "object") return false;

  // A `message` field indicates the wallet/provider failed to report
  // capabilities (unsupported wallet, RPC error, etc).
  if ("message" in capabilities) return false;

  const atomic = (capabilities as Record<string, unknown>).atomic;
  if (!atomic || typeof atomic !== "object") return false;

  return (atomic as Record<string, unknown>).status === "supported";
}
