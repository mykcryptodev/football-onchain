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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const NAV_SRC = readFileSync(
  resolve(import.meta.dirname, "navigation.tsx"),
  "utf8",
);

test("navigation appMetadata includes logoUrl", () => {
  assert.ok(
    NAV_SRC.includes("logoUrl"),
    "navigation.tsx must set appMetadata.logoUrl so wallets receive a high-res icon",
  );
});

test("logoUrl points to /icon.png", () => {
  assert.ok(
    NAV_SRC.includes("/icon.png"),
    "logoUrl must reference /icon.png (500×500 crisp icon), not favicon or OG image",
  );
});

test("logoUrl uses NEXT_PUBLIC_APP_URL for absolute URL on client", () => {
  assert.ok(
    NAV_SRC.includes("NEXT_PUBLIC_APP_URL"),
    "logoUrl must use NEXT_PUBLIC_APP_URL so it is an absolute URL accessible by external wallet apps",
  );
});

test("logoUrl has bankrball.com fallback for safety", () => {
  assert.ok(
    NAV_SRC.includes("bankrball.com"),
    "logoUrl must have a hardcoded bankrball.com fallback in case env var is absent",
  );
});
