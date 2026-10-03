import { describe, expect, test } from "bun:test";

import {
  nextUnpickedIndex,
  randomSide,
  sideFromSwipe,
  SWIPE_DISTANCE,
} from "../src/lib/swipe-picks";

describe("sideFromSwipe", () => {
  test("a long drag left picks away, right picks home", () => {
    expect(sideFromSwipe(-SWIPE_DISTANCE)).toBe(0);
    expect(sideFromSwipe(SWIPE_DISTANCE + 40)).toBe(1);
  });

  test("a short slow drag snaps back", () => {
    expect(sideFromSwipe(-40, 0.1)).toBeNull();
    expect(sideFromSwipe(60)).toBeNull();
  });

  test("a fast flick commits in its direction", () => {
    expect(sideFromSwipe(-45, -0.9)).toBe(0);
    expect(sideFromSwipe(45, 0.9)).toBe(1);
  });

  test("a fast tap with almost no travel does not pick", () => {
    expect(sideFromSwipe(5, 2)).toBeNull();
  });
});

describe("nextUnpickedIndex", () => {
  const ids = ["a", "b", "c", "d"];

  test("moves to the next unpicked game", () => {
    expect(nextUnpickedIndex(ids, { a: 0, b: 1 }, 0)).toBe(2);
  });

  test("wraps to an earlier game that is still unpicked", () => {
    expect(nextUnpickedIndex(ids, { a: 0, c: 1, d: 0 }, 3)).toBe(1);
  });

  test("returns the done index when every game is picked", () => {
    expect(nextUnpickedIndex(ids, { a: 0, b: 1, c: 0, d: 1 }, 1)).toBe(4);
  });

  test("ignores values that are not a side", () => {
    expect(nextUnpickedIndex(ids, { a: 0, b: 2, c: 1, d: 0 }, 0)).toBe(1);
  });
});

test("randomSide splits on 0.5", () => {
  expect(randomSide(() => 0.2)).toBe(0);
  expect(randomSide(() => 0.7)).toBe(1);
});
