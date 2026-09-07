import assert from "node:assert/strict";
import { mock, test } from "node:test";

import {
  contestDescription,
  creatorIdentity,
  resolveCreator,
} from "./contest-description";

const address = "0x1111111111111111111111111111111111111111";
test("ENS takes precedence over social profiles and preserves the creator address", () => {
  assert.deepEqual(
    creatorIdentity(address, [
      {
        type: "farcaster",
        name: "A display name",
        metadata: { username: "myk" },
      },
      { type: "ens", name: "myk.eth", metadata: { address } },
    ]),
    { address, displayName: "myk.eth", source: "ens" },
  );
});
test("Farcaster uses the username from metadata, not its display name", () => {
  assert.equal(
    creatorIdentity(address, [
      {
        type: "farcaster",
        name: "Someone Else",
        metadata: { username: "myk" },
      },
    ]).displayName,
    "@myk (Farcaster)",
  );
  assert.equal(
    creatorIdentity(address, [{ type: "farcaster", name: "Someone Else" }])
      .source,
    "wallet",
  );
});
test("mismatched ENS and ambiguous handles are skipped", () => {
  assert.equal(
    creatorIdentity(address, [
      {
        type: "ens",
        name: "wrong.eth",
        metadata: { address: "0x2222222222222222222222222222222222222222" },
      },
      { type: "farcaster", metadata: { username: "one" } },
      { type: "farcaster", metadata: { username: "two" } },
      { type: "lens", name: "myk.lens" },
    ]).displayName,
    "myk.lens (Lens)",
  );
});
test("missing and malformed names fall back to the wallet", () => {
  assert.deepEqual(
    creatorIdentity(address, [{ type: "ens", name: "bad\nname.eth" }]),
    { address, displayName: "0x1111…1111", source: "wallet" },
  );
});
test("summary includes live season, creator and exact formatted fee", () => {
  const creator = creatorIdentity(address, [{ type: "ens", name: "myk.eth" }]);
  const result = contestDescription(
    { weekNumber: 1, seasonType: 2, year: 2026n },
    creator,
    "1",
    "USDC",
  );
  assert.equal(
    result.summary,
    "Week 1 of the regular season (2026), created by myk.eth, for 1 USDC per entry.",
  );
  assert.deepEqual(result.season, {
    week: 1,
    type: 2,
    year: 2026,
    label: "regular season",
  });
  assert.match(
    contestDescription(
      { weekNumber: 2, seasonType: 1, year: 2027n },
      creator,
      "0.000123",
      "ETH",
    ).summary,
    /preseason \(2027\).*0.000123 ETH per entry/,
  );
  assert.match(
    contestDescription(
      { weekNumber: 3, seasonType: 3, year: 2027n },
      creator,
      "0",
      "ETH",
    ).summary,
    /postseason/,
  );
  assert.equal(
    contestDescription(
      { weekNumber: 1, seasonType: 9, year: 2026n },
      creator,
      "1",
      "TEST",
    ).season.label,
    "season type 9",
  );
});
test("no configured identity provider leaves joining available with a wallet label", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    assert.equal((await resolveCreator(address)).source, "wallet");
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("provider failures and stalled lookups do not block contest details", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = "test-client";
  let finishLookup: ((response: Response) => void) | undefined;
  try {
    mock.method(globalThis, "fetch", async () => {
      throw new Error("Provider unavailable");
    });
    assert.equal((await resolveCreator(address)).source, "wallet");
    mock.restoreAll();
    mock.method(
      globalThis,
      "fetch",
      () =>
        new Promise<Response>(resolve => {
          finishLookup = resolve;
        }),
    );
    const start = Date.now();
    assert.equal((await resolveCreator(address)).source, "wallet");
    assert.ok(
      Date.now() - start < 2500,
      "identity lookup exceeded its response budget",
    );
  } finally {
    finishLookup?.(new Response(JSON.stringify({ data: [] })));
    mock.restoreAll();
    if (previous === undefined)
      delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    else process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});
