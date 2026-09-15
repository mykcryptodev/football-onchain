import { describe, expect, mock, test } from "bun:test";

const DEPLOYER_ADDRESS = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const DEPLOYER_LOWER = DEPLOYER_ADDRESS.toLowerCase();
const DEPLOYER_UPPER = DEPLOYER_ADDRESS.toUpperCase();

const EXPECTED_NAME = "0xDeployer";
const EXPECTED_AVATAR =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

const OTHER_ADDRESS = "0x0000000000000000000000000000000000000001";

// Stub heavy thirdweb dependencies — the override path must not call them.
let socialCallCount = 0;
mock.module("thirdweb", () => ({
  createThirdwebClient: () => ({}),
}));
mock.module("thirdweb/social", () => ({
  getSocialProfiles: async () => {
    socialCallCount++;
    return [];
  },
}));
mock.module("thirdweb/storage", () => ({
  resolveScheme: ({ uri }: { uri: string }) => uri,
}));
mock.module("@/lib/resolve-nft-image", () => ({
  resolveNftImageUrl: async () => undefined,
}));

const { resolvePickemImageProfile } = await import("./pickem-image-profile");

describe("resolvePickemImageProfile — identity override path", () => {
  test("returns exact override name and avatar for the deployer address", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_ADDRESS);
    expect(result.name).toBe(EXPECTED_NAME);
    expect(result.avatar).toBe(EXPECTED_AVATAR);
  });

  test("override is case-insensitive — lowercase address works", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_LOWER);
    expect(result.name).toBe(EXPECTED_NAME);
    expect(result.avatar).toBe(EXPECTED_AVATAR);
  });

  test("override is case-insensitive — uppercase address works", async () => {
    const result = await resolvePickemImageProfile(DEPLOYER_UPPER);
    expect(result.name).toBe(EXPECTED_NAME);
    expect(result.avatar).toBe(EXPECTED_AVATAR);
  });

  test("override path bypasses getSocialProfiles entirely", async () => {
    socialCallCount = 0;
    await resolvePickemImageProfile(DEPLOYER_ADDRESS);
    expect(socialCallCount).toBe(0);
  });

  test("non-overridden address falls through to social lookup (or fallback)", async () => {
    // No NEXT_PUBLIC_THIRDWEB_CLIENT_ID in test env → returns short-address fallback.
    const result = await resolvePickemImageProfile(OTHER_ADDRESS);
    // Fallback pattern: first 6 chars + ellipsis + last 4 chars
    expect(result.name).toMatch(/^0x0000…0001$/);
  });
});
