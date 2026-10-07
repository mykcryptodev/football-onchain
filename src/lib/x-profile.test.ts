import { describe, expect, test } from "bun:test";

import { xProfileUrl } from "./x-profile";

describe("xProfileUrl", () => {
  test("links valid handles, tolerating a leading @ and whitespace", () => {
    expect(xProfileUrl("enctmintmickogo")).toBe(
      "https://x.com/enctmintmickogo",
    );
    expect(xProfileUrl(" @SHAQ ")).toBe("https://x.com/SHAQ");
  });

  test("returns null for missing or malformed handles", () => {
    expect(xProfileUrl(undefined)).toBeNull();
    expect(xProfileUrl("")).toBeNull();
    expect(xProfileUrl("bad handle")).toBeNull();
    expect(xProfileUrl("evil.com/x")).toBeNull();
    expect(xProfileUrl("a".repeat(16))).toBeNull();
  });
});
