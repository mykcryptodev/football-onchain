import { describe, expect, test } from "bun:test";

import {
  buildPickemContestUrl,
  buildPickemOgImageUrl,
  buildPickemShareDescription,
  buildPickemShareTitle,
  buildPickemShareUrl,
  formatEntriesLabel,
  formatPlayersLabel,
  isEnteredShare,
  parsePickemOgRatio,
  PICKEM_OG_SIZES,
} from "./pickem-share";

const BASE = "https://superbowlsquares.app";

describe("entered flag", () => {
  test("accepts 1 and true", () => {
    expect(isEnteredShare("1")).toBe(true);
    expect(isEnteredShare("true")).toBe(true);
    expect(isEnteredShare("TRUE")).toBe(true);
  });

  test("rejects anything else", () => {
    expect(isEnteredShare(undefined)).toBe(false);
    expect(isEnteredShare("")).toBe(false);
    expect(isEnteredShare("0")).toBe(false);
    expect(isEnteredShare("yes")).toBe(false);
  });

  test("reads the first value of a repeated param", () => {
    expect(isEnteredShare(["1", "0"])).toBe(true);
    expect(isEnteredShare(["0", "1"])).toBe(false);
    expect(isEnteredShare([])).toBe(false);
  });
});

describe("og ratio", () => {
  test("defaults to the 3:2 mini app size", () => {
    expect(parsePickemOgRatio(undefined)).toBe("miniapp");
    expect(parsePickemOgRatio("nonsense")).toBe("miniapp");
  });

  test("opts into the 1.91:1 size explicitly", () => {
    expect(parsePickemOgRatio("og")).toBe("og");
    expect(parsePickemOgRatio("OG")).toBe("og");
  });

  test("og is 1200x630 and miniapp keeps the 3:2 Farcaster ratio", () => {
    expect(PICKEM_OG_SIZES.og).toEqual({ width: 1200, height: 630 });
    expect(PICKEM_OG_SIZES.miniapp).toEqual({ width: 1200, height: 800 });
    expect(
      PICKEM_OG_SIZES.miniapp.width / PICKEM_OG_SIZES.miniapp.height,
    ).toBeCloseTo(3 / 2);
  });
});

describe("share urls", () => {
  test("contest url has no share state", () => {
    expect(buildPickemContestUrl(BASE, 82)).toBe(`${BASE}/pickem/82`);
  });

  test("share url flags the entry", () => {
    expect(buildPickemShareUrl(BASE, 82)).toBe(`${BASE}/pickem/82?entered=1`);
  });

  test("share url carries no wallet or identity data", () => {
    const url = new URL(buildPickemShareUrl(BASE, 82));
    expect([...url.searchParams.keys()]).toEqual(["entered"]);
    expect(url.search).not.toMatch(/0x[a-fA-F0-9]{4}/);
  });

  test("tolerates a trailing slash on the base url", () => {
    expect(buildPickemShareUrl(`${BASE}/`, 82)).toBe(
      `${BASE}/pickem/82?entered=1`,
    );
  });
});

describe("og image urls", () => {
  test("plain miniapp url stays param-free for cache friendliness", () => {
    expect(buildPickemOgImageUrl({ baseUrl: BASE, contestId: 82 })).toBe(
      `${BASE}/api/og/pickem/82`,
    );
  });

  test("og ratio and entered flag round-trip through the parsers", () => {
    const url = new URL(
      buildPickemOgImageUrl({
        baseUrl: BASE,
        contestId: 82,
        entered: true,
        ratio: "og",
      }),
    );

    expect(url.pathname).toBe("/api/og/pickem/82");
    expect(parsePickemOgRatio(url.searchParams.get("ratio") ?? undefined)).toBe(
      "og",
    );
    expect(isEnteredShare(url.searchParams.get("entered") ?? undefined)).toBe(
      true,
    );
  });

  test("entered miniapp image keeps the 3:2 variant", () => {
    expect(
      buildPickemOgImageUrl({ baseUrl: BASE, contestId: 82, entered: true }),
    ).toBe(`${BASE}/api/og/pickem/82?entered=1`);
  });
});

describe("labels", () => {
  test("pluralizes entries", () => {
    expect(formatEntriesLabel(0)).toBe("0 entries");
    expect(formatEntriesLabel(1)).toBe("1 entry");
    expect(formatEntriesLabel(2)).toBe("2 entries");
  });

  test("pluralizes players", () => {
    expect(formatPlayersLabel(1)).toBe("1 player");
    expect(formatPlayersLabel(3)).toBe("3 players");
  });
});

describe("share copy", () => {
  const contest = {
    seasonTypeName: "Regular Season",
    weekNumber: 3,
    year: 2026,
    contestId: 82,
  };

  test("entered copy claims the entry", () => {
    expect(buildPickemShareTitle({ ...contest, entered: true })).toBe(
      "I'm in — Regular Season Week 3 2026 Pick'em",
    );
    expect(
      buildPickemShareDescription({ entered: true, totalEntries: 1 }),
    ).toContain("1 entry");
  });

  test("default copy is unchanged from the join invite", () => {
    expect(buildPickemShareTitle({ ...contest, entered: false })).toBe(
      "Regular Season Week 3 2026 - Pick'em Contest #82",
    );
    expect(
      buildPickemShareDescription({ entered: false, totalEntries: 2 }),
    ).toBe(
      "Join this Pick'em contest! 2 entries so far. Blockchain-powered fair play with instant payouts.",
    );
  });
});
