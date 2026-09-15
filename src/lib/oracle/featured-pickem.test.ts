import { describe, expect, it } from "bun:test";

import {
  firstKickoff,
  nextFeaturedWeek,
  sameGameOrder,
} from "./featured-pickem";

describe("nextFeaturedWeek", () => {
  it("targets exactly the following regular-season week", () => {
    expect(
      nextFeaturedWeek({ seasonType: 2, weekNumber: 1, year: 2026n }),
    ).toEqual({ year: 2026n, seasonType: 2, weekNumber: 2 });
  });

  it("stops after the last regular-season week", () => {
    expect(
      nextFeaturedWeek({ seasonType: 2, weekNumber: 18, year: 2026n }),
    ).toBeNull();
  });

  it("never creates from a preseason or postseason contest", () => {
    expect(
      nextFeaturedWeek({ seasonType: 1, weekNumber: 3, year: 2026n }),
    ).toBeNull();
    expect(
      nextFeaturedWeek({ seasonType: 3, weekNumber: 1, year: 2026n }),
    ).toBeNull();
  });
});

describe("firstKickoff", () => {
  it("returns the earliest event start in unix seconds", () => {
    expect(
      firstKickoff({
        events: [
          { id: "2", date: "2026-09-20T17:00Z" },
          { id: "1", date: "2026-09-18T00:15Z" },
          { id: "3", date: "2026-09-22T00:15Z" },
        ] as never,
      }),
    ).toBe(BigInt(Date.parse("2026-09-18T00:15Z") / 1000));
  });

  it("returns null when there are no dated events", () => {
    expect(firstKickoff({ events: [] })).toBeNull();
    expect(firstKickoff({})).toBeNull();
  });
});

describe("sameGameOrder", () => {
  it("requires identical ids in identical order", () => {
    expect(sameGameOrder([1n, 2n, 3n], [1n, 2n, 3n])).toBe(true);
    expect(sameGameOrder([1n, 2n, 3n], [1n, 3n, 2n])).toBe(false);
    expect(sameGameOrder([1n, 2n], [1n, 2n, 3n])).toBe(false);
  });
});
