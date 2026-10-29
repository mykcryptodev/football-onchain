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

describe("goyabean_eth week 6 promo override", () => {
  const address = "0xcea5239fdd392e40c2b766375c4de8c991941d87";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "goyabean_eth",
        avatar:
          "https://pbs.twimg.com/profile_images/2108689453019480064/TlhdX-pQ_400x400.jpg",
        xUsername: "goyabean_eth",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xcea5239fdd392e40c2b766375c4de8c991941d80"), undefined);
  });
});

describe("AtownBrown week 6 promo override", () => {
  const address = "0x8e2ff9fa070e6ac179fb395fc85bb76206b6261f";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "AtownBrown",
        avatar:
          "https://pbs.twimg.com/profile_images/2078480827243991040/nU1hT4ex_400x400.jpg",
        xUsername: "AtownBrown",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0x8e2ff9fa070e6ac179fb395fc85bb76206b62610"), undefined);
  });
});

describe("alexfacelesslbs week 6 promo override", () => {
  const address = "0x2083dafa75ac5c6e9b3b0a0109caa1161834fcf3";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "alexfacelesslbs",
        avatar:
          "https://pbs.twimg.com/profile_images/2086475775532822528/sIL6RYpW_400x400.jpg",
        xUsername: "alexfacelesslbs",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0x2083dafa75ac5c6e9b3b0a0109caa1161834fcf0"), undefined);
  });
});

describe("beeple week 6 promo override", () => {
  const address = "0x5ffc9f91be129a910c1e2e321c1e2f49431c8261";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "beeple",
        avatar:
          "https://pbs.twimg.com/profile_images/264316321/beeple_headshot_beat_up_400x400.jpg",
        xUsername: "beeple",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0x5ffc9f91be129a910c1e2e321c1e2f49431c8260"), undefined);
  });
});

describe("nikitabier week 6 promo override", () => {
  const address = "0xc1860d00273984ffba4acf1f7a5828144036ac71";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "nikitabier",
        avatar:
          "https://pbs.twimg.com/profile_images/1755448801957945344/Fh2HNw5Y_400x400.jpg",
        xUsername: "nikitabier",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xc1860d00273984ffba4acf1f7a5828144036ac70"), undefined);
  });
});

describe("atifkhan31 week 6 promo override", () => {
  const address = "0xde0fd7fb78a06fdd877bcf787efc3eb4cef1ae4f";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "atifkhan31",
        avatar:
          "https://pbs.twimg.com/profile_images/1753149138370498560/tQwr9PAk_400x400.jpg",
        xUsername: "atifkhan31",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xde0fd7fb78a06fdd877bcf787efc3eb4cef1ae40"), undefined);
  });
});

describe("yugacohler week 6 promo override", () => {
  const address = "0xc95cc9387a427c318dea88acc311221cb2c3b670";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "yugacohler",
        avatar:
          "https://pbs.twimg.com/profile_images/2070835810891370496/rcRi5DOU_400x400.jpg",
        xUsername: "yugacohler",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xc95cc9387a427c318dea88acc311221cb2c3b671"), undefined);
  });
});

describe("1CrypticPoet week 6 promo override", () => {
  const address = "0x4e3830610efdc8cd559faf95dcfd46f07f4b0a08";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "1CrypticPoet",
        avatar:
          "https://pbs.twimg.com/profile_images/2080300918705131521/Ga_w3p8c_400x400.jpg",
        xUsername: "1CrypticPoet",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0x4e3830610efdc8cd559faf95dcfd46f07f4b0a00"), undefined);
  });
});

describe("Bankrball promo transit wallet override", () => {
  const address = "0xceb30cb69998d39ab004ebc7f3e9b9e0b31b0dc0";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "Bankrball",
        avatar:
          "https://bankrball.com/icon.png",
        xUsername: "myk_clawd",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xceb30cb69998d39ab004ebc7f3e9b9e0b31b0dc1"), undefined);
  });
});

describe("myk clawd promo entry wallet override", () => {
  const address = "0xcef6e6639e0c60d5c0805670f4363a6698081fab";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "myk clawd",
        avatar:
          "https://pbs.twimg.com/profile_images/2022302337315098624/58mcsWU2_400x400.jpg",
        xUsername: "myk_clawd",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xcef6e6639e0c60d5c0805670f4363a6698081fa0"), undefined);
  });
});

describe("darionwelch week 6 promo override", () => {
  const address = "0xa231a90ef039cc566444ee8ee75312a7787050e9";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "darionwelch",
        avatar:
          "https://pbs.twimg.com/profile_images/2042239885742845953/vCUN2Js2_400x400.jpg",
        xUsername: "darionwelch",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0xa231a90ef039cc566444ee8ee75312a7787050e0"), undefined);
  });
});

describe("kassr30 week 6 promo override", () => {
  const address = "0x552767c4276fda6f29d52d81f38b885879511635";
  for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "kassr30",
        avatar:
          "https://pbs.twimg.com/profile_images/1877787501252734976/TSMeNzK0_400x400.jpg",
        xUsername: "kassr30",
      });
    });
  }
  test("near-neighbor remains unresolved", () => {
    assert.equal(getIdentityOverride("0x552767c4276fda6f29d52d81f38b885879511630"), undefined);
  });
});

describe("abdullaalkamil week 7 promo override", () => {
  const address = "0xfc3dbc6851d79148385a231b3fda58a709f61aa0";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "abdullaalkamil",
        avatar:
          "https://pbs.twimg.com/profile_images/1325295392188215296/RSDXtDGx_400x400.jpg",
        xUsername: "abdullaalkamil",
      });
    });
  }
});

describe("dylanorrell week 7 promo override", () => {
  const address = "0xe4f667d7d1a14e2a6a17488cda6e372568af6d02";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "dylanorrell",
        avatar:
          "https://pbs.twimg.com/profile_images/2070526709137285120/Y8sJN2ya_400x400.jpg",
        xUsername: "dylanorrell",
      });
    });
  }
});

describe("Dipdas2001 week 7 promo override", () => {
  const address = "0xd501b8964830ae1787ad9cca8b124262b5d9a294";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "Dipdas2001",
        avatar:
          "https://pbs.twimg.com/profile_images/1995565528371658758/34wGCWoa_400x400.jpg",
        xUsername: "Dipdas2001",
      });
    });
  }
});

describe("mleejr week 7 promo override", () => {
  const address = "0xffa5e6813918094d1c4d5b719fa7edd3be2b64dd";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "mleejr",
        avatar:
          "https://pbs.twimg.com/profile_images/1601094719525855232/aOkAPHtC_400x400.png",
        xUsername: "mleejr",
      });
    });
  }
});

describe("jordanfrankfurt week 7 promo override", () => {
  const address = "0x28812fdd1fb5b8a90a6bdaf3239015103fad6980";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "jordanfrankfurt",
        avatar:
          "https://pbs.twimg.com/profile_images/2084741330173906944/VYq6zvdt_400x400.jpg",
        xUsername: "jordanfrankfurt",
      });
    });
  }
});

describe("joaniekcusack week 7 promo override", () => {
  const address = "0x371042f1dc90bac0f6635079fbc33154ea10c480";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "joaniekcusack",
        avatar:
          "https://pbs.twimg.com/profile_images/1877826912208474113/hyN9NpBj_400x400.jpg",
        xUsername: "joaniekcusack",
      });
    });
  }
});

describe("taylor_ week 7 promo override", () => {
  const address = "0xdbdd66305aff9abede264d041d6c4491e5177d7d";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "taylor_",
        avatar:
          "https://pbs.twimg.com/profile_images/2036891105426345984/39vcHLym_400x400.jpg",
        xUsername: "taylor_",
      });
    });
  }
});

describe("beckerrjon week 7 promo override", () => {
  const address = "0x030c588f51bc10b439ef38840f6462523170299f";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "beckerrjon",
        avatar:
          "https://pbs.twimg.com/profile_images/2090520125472477184/vnxbzuQX_400x400.jpg",
        xUsername: "beckerrjon",
      });
    });
  }
});

describe("primo_data week 7 promo override", () => {
  const address = "0x188956bd4979db0d5644e11f37bffba60cd6ada0";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "primo_data",
        avatar:
          "https://pbs.twimg.com/profile_images/1944130656465756160/b32ZJLds_400x400.jpg",
        xUsername: "primo_data",
      });
    });
  }
});

describe("zosegal week 7 promo override", () => {
  const address = "0x85581e3ef635b590a23cf697fe1ddad802c23aab";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "zosegal",
        avatar:
          "https://pbs.twimg.com/profile_images/1493325992793837568/g4FpbmUP_400x400.jpg",
        xUsername: "zosegal",
      });
    });
  }
});

describe("KieranOnBase week 7 promo override", () => {
  const address = "0x4a35858abef8499f9294de1773ea5d99f00fd4f0";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "KieranOnBase",
        avatar:
          "https://pbs.twimg.com/profile_images/2102878951462805504/2dzslA8S_400x400.jpg",
        xUsername: "KieranOnBase",
      });
    });
  }
});

describe("cankeremgurel week 7 promo override", () => {
  const address = "0x46cc0fdf8307663c172a802bba34414c74a30b46";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "cankeremgurel",
        avatar:
          "https://pbs.twimg.com/profile_images/1878426945295396864/vFMTxoNK_400x400.jpg",
        xUsername: "cankeremgurel",
      });
    });
  }
});

describe("itscrunklez week 7 promo override", () => {
  const address = "0x345352deb1632c5bb77734b0a9250fcc8e27f948";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "itscrunklez",
        avatar:
          "https://pbs.twimg.com/profile_images/1805517008680689666/-ovM-Bdi_400x400.jpg",
        xUsername: "itscrunklez",
      });
    });
  }
});

describe("KQpewpew week 7 promo override", () => {
  const address = "0x32bd679a84a8c9ceca29069d0de7667a4482101c";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "KQpewpew",
        avatar:
          "https://pbs.twimg.com/profile_images/1689513236675362817/ILSy9DNz_400x400.jpg",
        xUsername: "KQpewpew",
      });
    });
  }
});

describe("bfresh week 8 promo override", () => {
  const address = "0xd146d5deb5bc014576598a9242710d1b58f40b19";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "bfresh",
        avatar:
          "https://pbs.twimg.com/profile_images/2000318571042230273/TgLu63az_400x400.jpg",
        xUsername: "bfresh",
      });
    });
  }
});

describe("alexanderchopan week 8 promo override", () => {
  const address = "0x3f0728d11aed94e166272dab266b6b617e94d6fc";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "alexanderchopan",
        avatar:
          "https://pbs.twimg.com/profile_images/2093589237300158464/llVaTA6K_400x400.jpg",
        xUsername: "alexanderchopan",
      });
    });
  }
});

describe("brad_or_bradley week 8 promo override", () => {
  const address = "0xf4616effa60f1deaf3ed24f0df19ec403989ecb6";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "brad_or_bradley",
        avatar:
          "https://pbs.twimg.com/profile_images/1407865444430614528/HCEKSw0T_400x400.jpg",
        xUsername: "brad_or_bradley",
      });
    });
  }
});

describe("saintniko week 8 promo override", () => {
  const address = "0xfad98d56fa986978ae6e71f43ccd5fe20591cf54";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "saintniko",
        avatar:
          "https://pbs.twimg.com/profile_images/2101866582708293632/emJ9rau8_400x400.jpg",
        xUsername: "saintniko",
      });
    });
  }
});

describe("sammybauch week 8 promo override", () => {
  const address = "0x6bb22774ae4f5782cf18c8f4f05eb39e427fa7c4";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "sammybauch",
        avatar:
          "https://pbs.twimg.com/profile_images/1583156442227408896/ejTm0QUu_400x400.jpg",
        xUsername: "sammybauch",
      });
    });
  }
});

describe("710_eth week 8 promo override", () => {
  const address = "0x4ae0bedc562c1ba1b5da166a717a4d90a10bbfbb";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "710_eth",
        avatar:
          "https://pbs.twimg.com/profile_images/2066617053977640960/CfWymoTM_400x400.jpg",
        xUsername: "710_eth",
      });
    });
  }
});

describe("mroliverpt week 8 promo override", () => {
  const address = "0xf4cc70c8278f40a7fc78b7eca0b59667e2afe739";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "mroliverpt",
        avatar:
          "https://pbs.twimg.com/profile_images/2077046952806486016/K-H7oBcR_400x400.jpg",
        xUsername: "mroliverpt",
      });
    });
  }
});

describe("nalin week 8 promo override", () => {
  const address = "0xe49ea285c3b507f044cb309c9867d83a2fa64636";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "nalin",
        avatar:
          "https://pbs.twimg.com/profile_images/1811437997092646912/19X-wMLZ_400x400.jpg",
        xUsername: "nalin",
      });
    });
  }
});

describe("carlosjmelgar week 8 promo override", () => {
  const address = "0x1f65538f5bb02b70f5dc9c596a7d4e1e3978192e";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "carlosjmelgar",
        avatar:
          "https://pbs.twimg.com/profile_images/2110371267450753025/Z7qWtOqr_400x400.jpg",
        xUsername: "carlosjmelgar",
      });
    });
  }
});

describe("TrustlessState week 8 promo override", () => {
  const address = "0x3828e7f548ae96396e9430b089ec388757f32d6a";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "TrustlessState",
        avatar:
          "https://pbs.twimg.com/profile_images/2103545101439897600/qGB-5oBP_400x400.jpg",
        xUsername: "TrustlessState",
      });
    });
  }
});

describe("0FJAKE week 8 promo override", () => {
  const address = "0xcbacfd51fb04bb996565f4b03c53bd0932fa740c";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "0FJAKE",
        avatar:
          "https://pbs.twimg.com/profile_images/2090026296902324224/PMGEU5tW_400x400.jpg",
        xUsername: "0FJAKE",
      });
    });
  }
});

describe("ttyl5h week 8 promo override", () => {
  const address = "0xb33da999dc28bafd0c7c5fbeae9f5e0a10903dbc";
  for (const input of [address, address.toUpperCase().replace("0X", "0x")]) {
    test(`exact metadata for ${input}`, () => {
      assert.deepEqual(getIdentityOverride(input), {
        name: "ttyl5h",
        avatar:
          "https://pbs.twimg.com/profile_images/2008762825754443776/DH9iWkdD_400x400.jpg",
        xUsername: "ttyl5h",
      });
    });
  }
});
