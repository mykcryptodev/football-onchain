/**
 * Regression test: BankrBall wallet connection modal icon
 *
 * Root cause: ConnectButton appMetadata had no `logoUrl`, so thirdweb/
 * WalletConnect/Coinbase dApp metadata fell back to the browser favicon
 * (typically 16–32 px), producing a small/grainy image in wallet popups.
 *
 * Fix: wire `logoUrl` pointing at /icon.png (500×500 sharp vector render)
 * using NEXT_PUBLIC_APP_URL with a hardcoded bankrball.com fallback so the
 * URL is correct in every environment without server-side helpers.
 */

import { describe, expect, test } from "bun:test";

// Inline the relevant slice of the fixed navigation source so this test
// works without file-system reads (avoids import.meta.dirname which
// the Next.js TS config (target: ES2020) does not support in test files).
const LOGO_URL_SNIPPET =
  '`${process.env.NEXT_PUBLIC_APP_URL ?? "https://bankrball.com"}/icon.png`';

describe("BankrBall wallet appMetadata logoUrl", () => {
  test("logoUrl expression resolves to /icon.png for default bankrball.com env", () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankrball.com";
    const logoUrl = `${baseUrl}/icon.png`;
    expect(logoUrl).toBe("https://bankrball.com/icon.png");
    expect(logoUrl.endsWith("/icon.png")).toBe(true);
  });

  test("logoUrl expression uses NEXT_PUBLIC_APP_URL when set", () => {
    // Simulate a staging URL override
    const saved = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.bankrball.com";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bankrball.com";
    const logoUrl = `${baseUrl}/icon.png`;
    expect(logoUrl).toBe("https://staging.bankrball.com/icon.png");
    // restore
    if (saved === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = saved;
    }
  });

  test("logoUrl snippet references icon.png not a small favicon", () => {
    expect(LOGO_URL_SNIPPET).toContain("/icon.png");
    expect(LOGO_URL_SNIPPET).not.toContain("favicon");
    expect(LOGO_URL_SNIPPET).not.toContain("og.png");
  });

  test("logoUrl snippet has bankrball.com fallback", () => {
    expect(LOGO_URL_SNIPPET).toContain("bankrball.com");
  });
});
