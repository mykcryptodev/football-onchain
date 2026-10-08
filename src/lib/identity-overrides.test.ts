import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getIdentityOverride,
  IDENTITY_OVERRIDES,
  type IdentityOverride,
} from "./identity-overrides";

const DEPLOYER_ADDRESS = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const DEPLOYER_LOWER = DEPLOYER_ADDRESS.toLowerCase();
const DEPLOYER_UPPER = DEPLOYER_ADDRESS.toUpperCase();
const DEPLOYER_MIXED = "0xce370EBCBC655f845DF7DFb8C079E75B5EA17D93";

const EXPECTED_NAME = "0xDeployer";
const EXPECTED_X_USERNAME = "0xDeployer";
const EXPECTED_AVATAR =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

describe("getIdentityOverride", () => {
  test("returns override for the exact canonical address", () => {
    const result = getIdentityOverride(DEPLOYER_ADDRESS);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
    assert.equal(result!.xUsername, EXPECTED_X_USERNAME);
  });

  test("returns override for a fully-lowercased address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_LOWER);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
    assert.equal(result!.xUsername, EXPECTED_X_USERNAME);
  });

  test("returns override for a fully-uppercased address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_UPPER);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
    assert.equal(result!.xUsername, EXPECTED_X_USERNAME);
  });

  test("returns override for a mixed-case address (case-insensitive)", () => {
    const result = getIdentityOverride(DEPLOYER_MIXED);
    assert.notEqual(result, undefined);
    assert.equal(result!.name, EXPECTED_NAME);
    assert.equal(result!.avatar, EXPECTED_AVATAR);
    assert.equal(result!.xUsername, EXPECTED_X_USERNAME);
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

describe("xUsername field", () => {
  test("every entry carries an X username with no leading @", () => {
    assert.notEqual(IDENTITY_OVERRIDES.length, 0);
    for (const entry of IDENTITY_OVERRIDES) {
      assert.match(
        entry.xUsername,
        /^[A-Za-z0-9_]{1,15}$/,
        `${entry.address} has an invalid xUsername`,
      );
      assert.equal(entry.xUsername.startsWith("@"), false);
    }
  });

  test("week 2 winner wallet maps to @jason", () => {
    const result = getIdentityOverride(
      "0xF68d7c8Ff22f765e93e4441F1A66e5d3A9Ac6318",
    );
    assert.notEqual(result, undefined);
    assert.equal(result!.xUsername, "jason");
  });
});

describe("mleejr display-only exception", () => {
  const address = "0x0A719F84fb1728F9e6Fe7f34D9F730C6c46Bbebb";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "mleejr",
        avatar:
          "https://pbs.twimg.com/profile_images/1601094719525855232/aOkAPHtC_400x400.png",
        xUsername: "mleejr",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0x0a719f84fb1728f9e6fe7f34d9f730c6c46bbebc"),
      undefined,
    );
  });
});

describe("bobdole contest 21 entrant override", () => {
  const address = "0xB326320916F52d0Bd5F191E324ED63da1cEaCA81";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "bobdole",
        avatar:
          "https://pbs.twimg.com/profile_images/1905660094047559681/LRd1OsbA_400x400.jpg",
        xUsername: "bobdole08923509",
      });
    });
  }
});

describe("tldr_x contest 21 entrant override", () => {
  const address = "0x63C1A944b81604470C083979e40536D0fa02880E";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "tldr_x",
        avatar:
          "https://pbs.twimg.com/profile_images/1859688803717230592/5LG27ZQn_400x400.jpg",
        xUsername: "tldr_x",
      });
    });
  }
});

describe("michaeleric contest 21 winner override", () => {
  const address = "0x4ACF34ef9A01a433B93F59DE8aF638d27d5e1be2";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "_michaeleric_",
        avatar:
          "https://pbs.twimg.com/profile_images/2042558094169739264/KYSVyrWL_400x400.jpg",
        xUsername: "_michaeleric_",
      });
    });
  }
});

describe("adambro.eth avatar override", () => {
  const address = "0x3C29D4b663b0DA3616405973457A8e18e1A0A691";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "adambro.eth",
        avatar:
          "https://pbs.twimg.com/profile_images/1760357136213716992/OCoumypZ_400x400.jpg",
        xUsername: "A_Browman",
      });
    });
  }
});

describe("lightsnack89 display-only exception", () => {
  const address = "0xaAfC34e0BCeA1FA5Ae36172464bD14400C4de7bB";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "lightsnack89",
        avatar:
          "https://pbs.twimg.com/profile_images/2090638665710239744/jmJ9DbeD_400x400.jpg",
        xUsername: "lightsnack89",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0xaafc34e0bcea1fa5ae36172464bd14400c4de7bc"),
      undefined,
    );
  });
});

describe("starl3xx display-only exception", () => {
  const address = "0x0568af10694f0af63302675e3c0d5d50237b1c5d";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "starl3xx",
        avatar:
          "https://pbs.twimg.com/profile_images/1983584918476103680/9RdD8AQ__400x400.jpg",
        xUsername: "starl3xx",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0x0568af10694f0af63302675e3c0d5d50237b1c5e"),
      undefined,
    );
  });
});

describe("0xQuit display-only exception", () => {
  const address = "0x0fd4b6dc23b29f5768f636d0b65dd05ecc0d7f3b";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "0xQuit",
        avatar:
          "https://pbs.twimg.com/profile_images/2056824577393922048/E5Yh_548_400x400.png",
        xUsername: "0xQuit",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0x0fd4b6dc23b29f5768f636d0b65dd05ecc0d7f3c"),
      undefined,
    );
  });
});

describe("enctmintmickogo contest 22 winner override", () => {
  const address = "0xfafe70b60908162956a5c1c6a16a1261dd183d30";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "enctmintmickogo",
        avatar:
          "https://pbs.twimg.com/profile_images/2100381154251612160/o8byKMAZ_400x400.jpg",
        xUsername: "enctmintmickogo",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0xfafe70b60908162956a5c1c6a16a1261dd183d31"),
      undefined,
    );
  });
});

describe("Daqs_Pickem week 5 promo override", () => {
  const address = "0x623478df8e06f419b5b0890abdee598d020cd51d";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "Daqs_Pickem",
        avatar:
          "https://pbs.twimg.com/profile_images/1987851108534951936/83YowbSt_400x400.jpg",
        xUsername: "Daqs_Pickem",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0x623478df8e06f419b5b0890abdee598d020cd51e"),
      undefined,
    );
  });
});

describe("alecglovett week 5 promo override", () => {
  const address = "0x817db4cce654e03aa6683f076c293dc3a57258d7";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "alecglovett",
        avatar:
          "https://pbs.twimg.com/profile_images/1978990221678067712/BqJAZ7QF_400x400.jpg",
        xUsername: "alecglovett",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(
      getIdentityOverride("0x817db4cce654e03aa6683f076c293dc3a57258d8"),
      undefined,
    );
  });
});
