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

  test("keeps every contest visible when the repository denylist is empty", () => {
    const contests = [{ id: 9 }, { id: 10 }, { id: 11 }];
    expect(visiblePickemContests(contests)).toEqual(contests);
    expect(isPickemContestHidden(10)).toBe(false);
  });

  test("accepts bigint IDs used by Bankr discovery", () => {
    expect(isContestIdHidden(10n, [10])).toBe(true);
  });
});
