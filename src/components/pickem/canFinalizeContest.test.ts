import { describe, expect, test } from "bun:test";

import { canFinalizeContest } from "./canFinalizeContest";

describe("canFinalizeContest", () => {
  test("hides the action when week results are not finalized", () => {
    expect(canFinalizeContest(false, false)).toBe(false);
    expect(canFinalizeContest(false, undefined)).toBe(false);
  });

  test("hides the action when contest games are already finalized", () => {
    expect(canFinalizeContest(true, true)).toBe(false);
  });

  test("shows the action only when week results are finalized and contest is not", () => {
    expect(canFinalizeContest(false, true)).toBe(true);
    expect(canFinalizeContest(undefined, true)).toBe(true);
  });
});
