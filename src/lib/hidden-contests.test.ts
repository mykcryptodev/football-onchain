import { describe, expect, test } from "bun:test";

import {
  isContestIdHidden,
  isPickemContestHidden,
  visibleContests,
  visiblePickemContests,
} from "./hidden-contests";

describe("hidden pick'em contests", () => {
  test("filters configured IDs from public discovery", () => {
    const contests = [{ id: 9 }, { id: 10 }, { id: 11 }];
    expect(visibleContests(contests, [10])).toEqual([{ id: 9 }, { id: 11 }]);
    expect(isContestIdHidden(10, [10])).toBe(true);
  });

  test("hides all Pick'em contests while the global switch is enabled", () => {
    const contests = [{ id: 9 }, { id: 10 }, { id: 11 }];
    expect(visiblePickemContests(contests)).toEqual([]);
    expect(isPickemContestHidden(10)).toBe(true);
  });

  test("accepts bigint IDs used by Bankr discovery", () => {
    expect(isContestIdHidden(10n, [10])).toBe(true);
  });
});
