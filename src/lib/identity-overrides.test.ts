import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getIdentityOverride,
  type IdentityOverride,
} from "./identity-overrides";

const DEPLOYER_ADDRESS = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const DEPLOYER_LOWER = DEPLOYER_ADDRESS.toLowerCase();
const DEPLOYER_UPPER = DEPLOYER_ADDRESS.toUpperCase();
const DEPLOYER_MIXED = "0xce370EBCBC655f845DF7DFb8C079E75B5EA17D93";

const EXPECTED_NAME = "0xDeployer";
const EXPECTED_AVATAR =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

describe("getIdentityOverride", () => {
  test("returns override for the exact canonical address", () => {
    const result = getIdentityOverride(DEPLOYER_ADDRESS);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
  });

  test("returns override for a fully-lowercased address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_LOWER);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
  });

  test("returns override for a fully-uppercased address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_UPPER);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
  });

  test("returns override for a mixed-case address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_MIXED);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
  });

  test("exact name value is '0xDeployer' (no trimming needed, no ENS/Farcaster suffix)", () => {
    const result = getIdentityOverride(DEPLOYER_ADDRESS);
    assert.equal(result!.name, "0xDeployer");
  });

  test("avatar URL is the exact pbs.twimg.com HTTPS URL", () => {
    const result = getIdentityOverride(DEPLOYER_ADDRESS);
    assert.match(result!.avatar, /^https:\/\/pbs\.twimg\.com\//);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
  });

  test("returns undefined for a non-overridden address", () => {
    const result = getIdentityOverride(
      "0x0000000000000000000000000000000000000001",
    );
    assert.equal(result, undefined);
  });

  test("returns undefined for the zero address", () => {
    const result = getIdentityOverride(
      "0x0000000000000000000000000000000000000000",
    );
    assert.equal(result, undefined);
  });

  test("returns undefined for an address that shares the deployer prefix but differs", () => {
    // One character off at the end
    const result = getIdentityOverride(
      "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D94",
    );
    assert.equal(result, undefined);
  });

  test("override result has no fid, farcasterUsername, or bio properties", () => {
    const result = getIdentityOverride(DEPLOYER_ADDRESS) as IdentityOverride & {
      fid?: unknown;
      farcasterUsername?: unknown;
      bio?: unknown;
    };
    assert.equal(result!.fid, undefined);
    assert.equal(result!.farcasterUsername, undefined);
    assert.equal(result!.bio, undefined);
  });
});
