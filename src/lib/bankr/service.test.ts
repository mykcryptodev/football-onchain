import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import { decodeFunctionData, erc20Abi, zeroAddress } from "viem";

import { abi } from "@/constants/abis/pickem";

import {
  address,
  entryPage,
  payoutPreview,
  prepareEntry,
  rpc,
  settlement,
} from "./service";

const account = "0x1111111111111111111111111111111111111111";
const currency = "0x2222222222222222222222222222222222222222";
const c = {
  id: 3n,
  creator: account,
  gameIds: [9n, 2n],
  currency,
  entryFee: 1000000n,
  gamesFinalized: false,
  submissionDeadline: 1000n,
  year: 2026n,
  seasonType: 2,
  weekNumber: 1,
  totalEntries: 1n,
  payoutComplete: false,
  payoutDeadline: 50n,
  totalPrizePool: 1000001n,
  tiebreakerGameId: 2n,
  payoutStructure: { payoutType: 0, payoutPercentages: [1000n] },
};
afterEach(() => mock.restoreAll());
function setup(overrides: Record<string, unknown> = {}) {
  const values = {
    getContest: c,
    getUserTokensForContest: [],
    allowance: 0n,
    gameScoreOracle: currency,
    getWeekGames: [[9n, 2n], 1n],
    weekResults: [0n, 0n, 2, true, 44n, 2n],
    getContestTokenIds: [10n],
    pickemNFT: currency,
    getUserPrediction: [3n, account, 1n, 44n, 0, false, false],
    getUserPicks: [1, 0],
    getContestLeaderboard: [
      { tokenId: 10n, score: 2, tiebreakerPoints: 44n, submissionTime: 1n },
    ],
    TREASURY_FEE: 20n,
    PERCENT_DENOMINATOR: 1000n,
    treasury: currency,
    ownerOf: account,
    ...overrides,
  };
  mock.method(
    rpc,
    "readContract",
    async ({ functionName }: { functionName: string }) => {
      if (!(functionName in values))
        throw new Error(`Unexpected read: ${functionName}`);
      return values[functionName as keyof typeof values];
    },
  );
  mock.method(rpc, "getBlock", async () => ({ timestamp: 100n }));
  mock.method(rpc, "call", async () => ({ data: "0x" }));
  mock.method(
    rpc,
    "multicall",
    async ({ contracts }: { contracts: unknown[] }) =>
      contracts.map(() => values.getUserPrediction),
  );
}
const body = {
  wallet: account,
  picks: [1, 0],
  tiebreakerPoints: 44,
  expectedEntryCount: 0,
};
test("ERC20 approval is a separate progress step, followed by exact entry calldata", async () => {
  setup();
  const approval = await prepareEntry(3n, body);
  assert.equal(approval.step, "approve");
  assert.equal(approval.transaction.to, currency);
  assert.deepEqual(
    decodeFunctionData({ abi: erc20Abi, data: approval.transaction.data }).args,
    [address, c.entryFee],
  );
  mock.restoreAll();
  setup({ allowance: 1000000n });
  const entry = await prepareEntry(3n, body);
  assert.equal(entry.step, "enter");
  assert.equal(entry.transaction.value, "0");
  assert.deepEqual(
    decodeFunctionData({ abi, data: entry.transaction.data }).args,
    [3n, [1, 0], 44n],
  );
});
test("native entry sends only exact entry fee and zero-reset approval works", async () => {
  setup({ getContest: { ...c, currency: zeroAddress } });
  assert.equal((await prepareEntry(3n, body)).transaction.value, "1000000");
  mock.restoreAll();
  setup({ allowance: 1n });
  const result = await prepareEntry(3n, body);
  assert.equal(result.step, "reset-approval");
  assert.deepEqual(
    decodeFunctionData({ abi: erc20Abi, data: result.transaction.data }).args,
    [address, 0n],
  );
});
test("rejects a duplicate entry, closed deadline, invalid picks and missing tiebreaker", async () => {
  setup({ getUserTokensForContest: [10n] });
  await assert.rejects(prepareEntry(3n, body), /Entry count changed/);
  mock.restoreAll();
  setup({ getContest: { ...c, submissionDeadline: 100n } });
  await assert.rejects(prepareEntry(3n, body), /closed/);
  mock.restoreAll();
  setup();
  await assert.rejects(prepareEntry(3n, { ...body, picks: [1] }), /one 0/);
  await assert.rejects(
    prepareEntry(3n, { ...body, tiebreakerPoints: undefined }),
    /tiebreaker/,
  );
});
test("settlement discovers an unscored entry beyond the first batch", async () => {
  const ids = Array.from({ length: 101 }, (_, i) => BigInt(i));
  setup({
    getContest: {
      ...c,
      submissionDeadline: 90n,
      gamesFinalized: true,
      totalEntries: 101n,
    },
    getContestTokenIds: ids,
  });
  let batch = 0;
  mock.method(
    rpc,
    "multicall",
    async ({ contracts }: { contracts: unknown[] }) =>
      contracts.map(() => [3n, account, 1n, 44n, 1, batch++ < 100, false]),
  );
  const result = await settlement(3n, account);
  assert.equal(result.step, "score");
  assert.equal(result.unscoredCount, 1);
  assert.ok("transaction" in result);
  assert.deepEqual(
    decodeFunctionData({ abi, data: result.transaction.data }).args,
    [[100n]],
  );
});
test("settlement blocks same-length reordered oracle slate", async () => {
  setup({ getWeekGames: [[2n, 9n], 1n] });
  const result = await settlement(3n, account);
  assert.equal(result.step, "blocked-slate");
  assert.ok(!("transaction" in result));
});
test("payout only after scoring all entries and unlock; simulation failures do not yield a transaction", async () => {
  setup({
    getContest: { ...c, submissionDeadline: 90n, gamesFinalized: true },
    getUserPrediction: [3n, account, 1n, 44n, 2, true, false],
  });
  const result = await settlement(3n, account);
  assert.equal(result.step, "pay");
  assert.ok("transaction" in result);
  assert.equal(
    decodeFunctionData({ abi, data: result.transaction.data }).functionName,
    "claimAllPrizes",
  );
  mock.method(rpc, "call", async () => {
    throw new Error("Simulation reverted");
  });
  await assert.rejects(settlement(3n, account), /Simulation reverted/);
});
test("my picks follow NFT ownership, including empty filtered pages with a continuation", async () => {
  setup({
    getContestTokenIds: Array.from({ length: 51 }, (_, i) => BigInt(i)),
    ownerOf: currency,
  });
  const page = await entryPage(3n, 0, account);
  assert.equal(page.entries.length, 0);
  assert.equal(page.nextCursor, 50);
  const owned = await entryPage(3n, 50, currency);
  assert.equal(owned.entries.length, 1);
  assert.equal(owned.nextCursor, null);
});

test("payout preview uses current owner and exact integer fees without reallocating empty tiers", async () => {
  const contestWithTiers = {
    ...c,
    payoutStructure: { payoutType: 1, payoutPercentages: [600n, 300n, 100n] },
  };
  setup({
    getContest: contestWithTiers,
    ownerOf: currency,
    getUserPrediction: [3n, account, 1n, 44n, 2, true, false],
  });
  const preview = await payoutPreview(
    await rpc.readContract({
      address,
      abi,
      functionName: "getContest",
      args: [3n],
    }),
  );
  assert.equal(preview.treasuryFee, 20000n);
  assert.equal(preview.winners[0].currentOwner, currency);
  assert.equal(preview.winners[0].amount, 588000n);
  assert.equal(preview.remainingWinnerPayout, 588000n);
  assert.equal(preview.unallocatedPrizePool, 392001n);
  assert.equal(preview.allWinnersClaimed, false);
});
test("completed payout verifies winner claims and never reports current owner as historical recipient", async () => {
  setup({
    getContest: {
      ...c,
      gamesFinalized: true,
      payoutComplete: true,
      submissionDeadline: 90n,
    },
    getUserPrediction: [3n, account, 1n, 44n, 2, true, true],
  });
  const result = await settlement(3n, account);
  assert.equal(result.step, "complete");
  assert.equal(result.payout?.remainingWinnerPayout, 0n);
  assert.equal(result.payout?.allWinnersClaimed, true);
  assert.ok(!("transaction" in result));
  mock.restoreAll();
  setup({
    getContest: {
      ...c,
      gamesFinalized: true,
      payoutComplete: true,
      submissionDeadline: 90n,
    },
    getUserPrediction: [3n, account, 1n, 44n, 2, true, false],
  });
  await assert.rejects(settlement(3n, account), /claim state disagree/);
});
