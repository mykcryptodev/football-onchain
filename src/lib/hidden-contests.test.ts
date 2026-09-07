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

  test("hides existing contests and leaves future contests visible", () => {
    const contests = [{ id: 0 }, { id: 14 }, { id: 15 }];
    expect(visiblePickemContests(contests)).toEqual([{ id: 15 }]);
    expect(isPickemContestHidden(14)).toBe(true);
    expect(isPickemContestHidden(15)).toBe(false);
  });

  test("accepts bigint IDs used by Bankr discovery", () => {
    expect(isContestIdHidden(10n, [10])).toBe(true);
  });
});
