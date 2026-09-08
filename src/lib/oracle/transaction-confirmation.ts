import type { Hex, TransactionReceipt } from "viem";

export interface ReceiptClient {
  getTransactionReceipt(args: { hash: Hex }): Promise<TransactionReceipt>;
}

export type TransactionConfirmation =
  | { status: "success"; receipt: TransactionReceipt }
  | { status: "reverted"; receipt: TransactionReceipt }
  | { status: "unknown"; cause: unknown };

/**
 * Re-check a broadcast transaction after the normal receipt waiter fails.
 * Clients should be ordered from the preferred RPC to independent fallbacks.
 */
export async function reconcileTransactionReceipt(
  hash: Hex,
  clients: readonly ReceiptClient[],
): Promise<TransactionConfirmation> {
  let lastError: unknown = new Error("no receipt RPC clients configured");

  for (const client of clients) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      return receipt.status === "success"
        ? { status: "success", receipt }
        : { status: "reverted", receipt };
    } catch (error) {
      lastError = error;
    }
  }

  return { status: "unknown", cause: lastError };
}
