import { describe, expect, test } from "bun:test";

import { isValidTiebreaker } from "./pickem-entry";

describe("pick’em tiebreaker validation", () => {
  test("accepts zero and whole-number scores", () => {
    for (const value of ["0", "45", "100", "007"])
      expect(isValidTiebreaker(value)).toBe(true);
  });
  test("rejects missing, negative, fractional and unsafe values before payment", () => {
    for (const value of [
      "",
      " ",
      "-1",
      "1.5",
      "NaN",
      "Infinity",
      "1e3",
      "9007199254740992",
    ])
      expect(isValidTiebreaker(value)).toBe(false);
  });
});
