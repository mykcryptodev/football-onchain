import { spawnSync } from "node:child_process";

import { describe, expect, it } from "bun:test";

// Isolate module mocks: replacing viem/chain/redis in the main test process
// would contaminate the other oracle suites. Exercise the real sync function
// in a child with no network or private key, not a copy of its orchestration.
function runScenario(scenario: string) {
  const child = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import { mock } from "bun:test";
const viem = await import("viem");
const scenario = ${JSON.stringify(scenario)};
const address = "0xA473533c54D105C6334fE06c8624f7dfbb09ba25";
const done = "ens-primary:done:bankrball.eth";
const lock = "ens-primary:lock:bankrball.eth";
const state = new Map();
const calls = { reads: 0, signs: 0, sends: 0, simulations: 0 };
if (scenario === "cached") state.set(done, "1");
if (scenario === "locked") state.set(lock, "1");
mock.module("@/lib/redis", () => ({ redis: {
  get: async (key) => state.get(key) ?? null,
  set: async (key, value, options) => {
    if (options?.nx && state.has(key)) return null;
    state.set(key, value);
    return "OK";
  },
  del: async (key) => state.delete(key),
} }));
mock.module("./src/lib/oracle/chain", () => ({
  getReporterAccount: () => { calls.signs++; return { address }; },
}));
const reverseNode = viem.namehash(address.slice(2).toLowerCase() + ".addr.reverse");
mock.module("viem", () => ({
  ...viem,
  createPublicClient: () => ({
    readContract: async ({ functionName, args }) => {
      calls.reads++;
      if (functionName === "resolver") {
        if (args[0] === reverseNode && scenario !== "already-set") return viem.zeroAddress;
        return "0xF29100983E058B709F3D539b0c765937B804AC15";
      }
      if (functionName === "name") return "bankrball.eth";
      if (functionName === "addr") return scenario === "mismatch" ? viem.zeroAddress : address;
      throw new Error("Unexpected contract read");
    },
    getBalance: async () => scenario === "unfunded" ? 0n : 300000000000000n,
    simulateContract: async (request) => {
      calls.simulations++;
      if (scenario === "simulation-fails") throw new Error("simulation failed");
      if (request.functionName !== "setName" || request.args[0] !== "bankrball.eth") {
        throw new Error("Unexpected write");
      }
      return { request };
    },
    waitForTransactionReceipt: async () => {
      if (scenario === "receipt-unknown") throw new Error("receipt unknown");
      return { status: "success" };
    },
  }),
  createWalletClient: () => ({
    writeContract: async () => { calls.sends++; return "0x" + "1".repeat(64); },
  }),
}));
const { syncEnsPrimaryName } = await import("./src/lib/oracle/ens-primary-name");
const result = { writes: [], skips: [], errors: [] };
for (let i = 0; i < 2; i++) {
  try { await syncEnsPrimaryName(result); }
  catch (error) { result.errors.push(error.message); }
}
console.log(JSON.stringify({ calls, result, done: state.has(done), locked: state.has(lock) }));
`,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  expect(child.stderr).toBe("");
  expect(child.status).toBe(0);
  return JSON.parse(child.stdout);
}

describe("syncEnsPrimaryName", () => {
  it("does not read L1 or access the signer once done is cached", () => {
    const output = runScenario("cached");
    expect(output.calls).toEqual({
      reads: 0,
      signs: 0,
      sends: 0,
      simulations: 0,
    });
  });

  it("recognizes an existing reverse name and never sends again", () => {
    const output = runScenario("already-set");
    expect(output.done).toBe(true);
    expect(output.calls.sends).toBe(0);
    expect(output.result.skips).toEqual(["ensPrimary:bankrball.eth:set"]);
  });

  for (const [scenario, skip] of [
    ["mismatch", "forward-mismatch"],
    ["unfunded", "no-l1-gas"],
    ["locked", "in-flight"],
  ]) {
    it(`does not broadcast when ${scenario}`, () => {
      const output = runScenario(scenario);
      expect(output.calls.sends).toBe(0);
      expect(output.done).toBe(false);
      expect(output.result.skips).toEqual([
        `ensPrimary:bankrball.eth:${skip}`,
        `ensPrimary:bankrball.eth:${skip}`,
      ]);
    });
  }

  it("handles an absent reverse resolver and sends only once across two runs", () => {
    const output = runScenario("missing-reverse");
    expect(output.calls.sends).toBe(1);
    expect(output.calls.simulations).toBe(1);
    expect(output.done).toBe(true);
    expect(output.result.errors).toEqual([]);
    expect(output.result.writes).toHaveLength(1);
  });

  it("releases the lock after a failed simulation without broadcasting", () => {
    const output = runScenario("simulation-fails");
    expect(output.calls.sends).toBe(0);
    expect(output.calls.simulations).toBe(2);
    expect(output.locked).toBe(false);
    expect(output.done).toBe(false);
  });

  it("retains the lock on unknown confirmation and prevents an immediate resend", () => {
    const output = runScenario("receipt-unknown");
    expect(output.calls.sends).toBe(1);
    expect(output.locked).toBe(true);
    expect(output.done).toBe(false);
    expect(output.result.errors).toEqual(["receipt unknown"]);
    expect(output.result.skips).toEqual(["ensPrimary:bankrball.eth:in-flight"]);
  });
});
