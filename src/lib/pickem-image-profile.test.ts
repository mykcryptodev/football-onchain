import assert from "node:assert/strict";
import { describe, test } from "node:test";

const DEPLOYER_ADDRESS = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const DEPLOYER_LOWER = DEPLOYER_ADDRESS.toLowerCase();
const DEPLOYER_UPPER = DEPLOYER_ADDRESS.toUpperCase();

const EXPECTED_NAME = "0xDeployer";
const EXPECTED_AVATAR =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

const OTHER_ADDRESS = "0x0000000000000000000000000000000000000001";

const { resolvePickemImageProfile } = await import("./pickem-image-profile");

describe("resolvePickemImageProfile — identity override path", () => {
  test("returns exact override name and avatar for the deployer address", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_ADDRESS);
    assert.equal(result.name, EXPECTED_NAME);
    assert.equal(result.avatar, EXPECTED_AVATAR);
  });

  test("override is case-insensitive — lowercase address works", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_LOWER);
    assert.equal(result.name, EXPECTED_NAME);
    assert.equal(result.avatar, EXPECTED_AVATAR);
  });

  test("override is case-insensitive — uppercase address works", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_UPPER);
    assert.equal(result.name, EXPECTED_NAME);
    assert.equal(result.avatar, EXPECTED_AVATAR);
  });

  test("override path bypasses getSocialProfiles entirely", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      throw new Error("Unexpected lookup");
    }) as typeof fetch;
    try {
      await resolvePickemImageProfile(DEPLOYER_ADDRESS);
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("non-overridden address falls through to social lookup (or fallback)", async () => {
    // No NEXT_PUBLIC_THIRDWEB_CLIENT_ID in test env → returns short-address fallback.
    const result = await resolvePickemImageProfile(OTHER_ADDRESS);
    // Fallback pattern: first 6 chars + ellipsis + last 4 chars
    assert.match(result.name, /^0x0000…0001$/);
  });
});
