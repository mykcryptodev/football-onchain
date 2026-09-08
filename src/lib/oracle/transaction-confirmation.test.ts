import { describe, expect, it } from "bun:test";
import type { Hex, TransactionReceipt } from "viem";

import { reconcileTransactionReceipt } from "./transaction-confirmation";

const hash = `0x${"1".repeat(64)}` as Hex;
const receipt = (status: "success" | "reverted") =>
  ({ status } as TransactionReceipt);

describe("reconcileTransactionReceipt", () => {
  it("accepts a receipt found after the normal waiter timed out", async () => {
    const result = await reconcileTransactionReceipt(hash, [
      { getTransactionReceipt: async () => receipt("success") },
    ]);

    expect(result.status).toBe("success");
  });

  it("reports a reverted transaction", async () => {
    const result = await reconcileTransactionReceipt(hash, [
      { getTransactionReceipt: async () => receipt("reverted") },
    ]);

    expect(result.status).toBe("reverted");
  });

  it("uses an independent fallback RPC", async () => {
    let fallbackCalled = false;
    const result = await reconcileTransactionReceipt(hash, [
      {
        getTransactionReceipt: async () => {
          throw new Error("receipt not found");
        },
      },
      {
        getTransactionReceipt: async () => {
          fallbackCalled = true;
          return receipt("success");
        },
      },
    ]);

    expect(fallbackCalled).toBe(true);
    expect(result.status).toBe("success");
  });

  it("keeps a pending or unavailable transaction unknown", async () => {
    const result = await reconcileTransactionReceipt(hash, [
      {
        getTransactionReceipt: async () => {
          throw new Error("receipt not found");
        },
      },
      {
        getTransactionReceipt: async () => {
          throw new Error("RPC unavailable");
        },
      },
    ]);

    expect(result.status).toBe("unknown");
  });
});
