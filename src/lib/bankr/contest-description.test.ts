import assert from "node:assert/strict";
import { mock, test } from "node:test";

import {
  contestDescription,
  creatorIdentity,
  resolveCreator,
  resolveIdentities,
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

test("batched identities keep input order, casing, and duplicates with wallet fallbacks", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const other = "0xAbCdEf0000000000000000000000000000000002";
  try {
    const identities = await resolveIdentities([
      other,
      address,
      other.toLowerCase(),
    ]);
    assert.deepEqual(
      identities.map(i => [i.address, i.displayName, i.source]),
      [
        [other, "0xAbCd…0002", "wallet"],
        [address, "0x1111…1111", "wallet"],
        [other.toLowerCase(), "0xabcd…0002", "wallet"],
      ],
    );
    assert.deepEqual(await resolveIdentities([]), []);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

// ── Manual identity override (Bankr leaderboard + all consumers) ──────────────
const OVERRIDE_ADDR = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const OVERRIDE_AVATAR =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

test("override address resolves display name exactly", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const [id] = await resolveIdentities([OVERRIDE_ADDR]);
    assert.equal(id.displayName, "0xDeployer");
    assert.equal(id.source, "manual");
    assert.equal(id.avatar, OVERRIDE_AVATAR);
    assert.equal(id.address, OVERRIDE_ADDR);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("override address is case-insensitive — lowercase input resolves", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const [id] = await resolveIdentities([OVERRIDE_ADDR.toLowerCase()]);
    assert.equal(id.displayName, "0xDeployer");
    assert.equal(id.source, "manual");
    assert.equal(id.avatar, OVERRIDE_AVATAR);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("override address is case-insensitive — uppercase input resolves", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const [id] = await resolveIdentities([OVERRIDE_ADDR.toUpperCase()]);
    assert.equal(id.displayName, "0xDeployer");
    assert.equal(id.source, "manual");
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("non-override address is not affected by override table", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const [id] = await resolveIdentities([address]);
    assert.equal(id.source, "wallet");
    assert.equal(id.avatar, undefined);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("override resolves even when thirdweb is unavailable (no provider configured)", async () => {
  // Override must resolve to the manual identity even with no thirdweb client
  // configured — i.e. the pre-network short-circuit works regardless of env.
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const [id] = await resolveIdentities([OVERRIDE_ADDR]);
    assert.equal(id.displayName, "0xDeployer");
    assert.equal(id.source, "manual");
    assert.equal(id.avatar, OVERRIDE_AVATAR);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

test("override does not pollute non-override in a mixed batch", async () => {
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const identities = await resolveIdentities([OVERRIDE_ADDR, address]);
    assert.equal(identities[0].displayName, "0xDeployer");
    assert.equal(identities[0].source, "manual");
    assert.equal(identities[1].source, "wallet");
    assert.equal(identities[1].avatar, undefined);
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});

// ── Prototype-pollution guard + no-network-guarantee tests ──────────────────

test("OVERRIDES Map rejects inherited Object keys (__proto__, constructor, toString)", async () => {
  // A plain-object lookup would find these via the prototype chain; a Map
  // returns undefined for anything not explicitly inserted.
  const previousClient = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    // Import the function under test directly — no mock.method needed.
    const { getIdentityOverride } = await import("../identity-overrides");
    for (const key of [
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
    ]) {
      const result = getIdentityOverride(key);
      assert.equal(
        result,
        undefined,
        `getIdentityOverride("${key}") must be undefined; Map must not traverse prototype`,
      );
    }
  } finally {
    if (previousClient !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previousClient;
  }
});

test("override-only batch resolves without thirdweb client (no network required)", async () => {
  // With NEXT_PUBLIC_THIRDWEB_CLIENT_ID absent, the thirdweb path is skipped.
  // needsLookup is empty for an all-override batch so the Redis path is also
  // skipped. The test asserts correct names without any network mock.
  const previous = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  try {
    const results = await resolveIdentities([
      OVERRIDE_ADDR,
      OVERRIDE_ADDR.toLowerCase(),
      OVERRIDE_ADDR.toUpperCase(),
    ]);
    assert.ok(
      results.every(
        r => r.displayName === "0xDeployer" && r.source === "manual",
      ),
      "all three casing variants must resolve to manual override without any provider",
    );
  } finally {
    if (previous !== undefined)
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = previous;
  }
});
