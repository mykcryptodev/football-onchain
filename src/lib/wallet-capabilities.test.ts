import { describe, expect, test } from "bun:test";

import { supportsAtomicBatch } from "./wallet-capabilities";

describe("supportsAtomicBatch", () => {
  test("returns true when atomic status is supported", () => {
    expect(supportsAtomicBatch({ atomic: { status: "supported" } })).toBe(true);
  });

  test("returns false when atomic status is ready (upgrade needed)", () => {
    expect(supportsAtomicBatch({ atomic: { status: "ready" } })).toBe(false);
  });

  test("returns false when atomic status is unsupported", () => {
    expect(supportsAtomicBatch({ atomic: { status: "unsupported" } })).toBe(
      false,
    );
  });

  test("returns false when capabilities response is an error message", () => {
    expect(
      supportsAtomicBatch({ message: "wallet does not support EIP-5792" }),
    ).toBe(false);
  });

  test("returns false when atomic key is missing", () => {
    expect(supportsAtomicBatch({ paymasterService: { supported: true } })).toBe(
      false,
    );
  });

  test("returns false for null, undefined, or non-object input", () => {
    expect(supportsAtomicBatch(undefined)).toBe(false);
    expect(supportsAtomicBatch(null)).toBe(false);
    expect(supportsAtomicBatch("supported")).toBe(false);
  });

  test("ignores legacy atomicBatch.supported shape", () => {
    // Older draft of EIP-5792 used `atomicBatch: { supported: boolean }`;
    // the current spec (and thirdweb's implementation) uses `atomic.status`.
    expect(supportsAtomicBatch({ atomicBatch: { supported: true } })).toBe(
      false,
    );
  });
});
