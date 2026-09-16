# Pick’em wallet-browser regression checks

## Scope

These tests bundle the **actual** `PickemContestClient`, shared `Button`, draft/picks hooks, UI primitives (including Radix Dialog), Farcaster SDK, and app CSS. They do not copy the button implementations.

The fixture replaces network reads, active-account state, routing, non-entry child views, and `usePickemContract` at module boundaries. Its injected EIP-1193 provider rejects a submission locally. All non-local browser requests are blocked. No financial transaction is signed or broadcast.

The navigation fixture reserves 128 px for the sticky header; this is not an end-to-end test of the real navigation/ConnectButton. Provider selection, thirdweb signing, native wallet prompts, software-keyboard chrome, and physical Coinbase iOS/Android behavior still need device verification.

## Run the tests

Prerequisites: repository dependencies, Bun, and a Playwright installation with its selected browser and OS libraries. The fixture uses the installed `esbuild` and `postcss` dependencies. Browser tests are opt-in; ordinary `bun test` runs the synchronous Button regression tests and skips browser launch.

1. Run the focused unit checks:

   ```bash
   bun test tests/button-click.test.js src/lib/pickem-entry.test.ts src/lib/pickem-draft.test.ts src/lib/wallet-capabilities.test.ts
   ```

2. Run the Chromium touch suite:

   ```bash
   PICKEM_BROWSER_TEST=1 bun test --timeout 20000 tests/browser/pickem-touch.test.js
   ```

   If Playwright lives outside this repository, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. If needed, set `BROWSER_EXECUTABLE` to the matching browser binary. No dependency/lockfile change is required for an existing external installation.

3. Run the same suite in WebKit on a host with its OS dependencies:

   ```bash
   PICKEM_BROWSER_TEST=1 BROWSER=webkit bun test --timeout 20000 tests/browser/pickem-touch.test.js
   ```

   Omit a Chromium-specific `BROWSER_EXECUTABLE` when switching engines. WebKit was downloaded but **could not launch** on the investigation host because required GTK, GStreamer, and other libraries were missing. No WebKit pass is claimed.

4. Optionally set `PICKEM_SCREENSHOT` to an absolute PNG destination to capture the mobile submit control. Set `PICKEM_SOURCE_ROOT` to a clean baseline extraction with the same dependencies to test the original source with this fixture. This option changes the source/CSS being bundled, not the fixture.

## Evidence and expected results

Baseline: `7afe528ee1efe032cb7433fe463b57ec898f62c1`.

- With a silent `ReactNativeWebView` bridge, an enabled **Submit picks** reaches zero submission calls before the fix. The shared Button awaits `impactOccurred`, which waits on `sdk.getCapabilities()` without a timeout. A never-settling native haptic reproduces the same blockage. After the fix, the consumer runs synchronously and requests the local provider exactly once; cancellation leaves picks intact.
- The ordinary native **Review & enter** anchor works on baseline Chromium, even with silent haptics. Its default navigation does not await an async click handler. Do not describe that as a reproduced haptic navigation failure.
- A separate fault-injection test suppresses native fragment navigation. Baseline leaves the review card offscreen; the explicit scroll handler brings it below the sticky header. This verifies compatibility hardening, **not proof that a physical Coinbase version intercepts fragments**.
- Repeated review navigation, next-unpicked navigation, reduced motion, small touch viewports, submit hit-testing, other-wallet mobile/desktop, pending/rejected haptics, missing picks, invalid scores, loading/errors, missing games, insufficient balance, disconnected state, closed entries, submission locking, and a deadline race are covered.

Production changes are confined to two files: make shared Button haptics fire-and-forget with rejection handling; add explicit in-page scrolling to the mobile contest CTA while retaining its `href` fallback. No wallet/provider detection, transaction sequencing, validation, balance checks, or deadline is loosened.

## Dependency trace

Inspected installed miniapp SDK `0.2.1`, thirdweb `5.108.8`, and Coinbase Wallet SDK `4.3.0`:

- Miniapp `src/endpoint.ts` selects `ReactNativeWebView` and listens for `FarcasterFrameCallback`; `src/sdk.ts` exposes `getCapabilities` over Comlink. `isInMiniApp()` has a separate 1,000 ms check, unused by the haptics helper.
- Thirdweb `src/wallets/coinbase/coinbase-web.ts` constructs the Coinbase SDK provider. Coinbase `dist/util/provider.js` accepts `coinbaseWalletExtension` or an injected `ethereum.isCoinbaseBrowser` provider. The fixture sets Coinbase flags but does not exercise this connection path.
- Radix Slot composes child and slot handlers synchronously. The review anchor has its own handler; it does not rely on a delayed parent callback.

No evidence justified changing thirdweb wallet detection, raising z-indexes, adding touch-event handlers, or bypassing validation. The closed share dialog does not mount an overlay in the tested entry state; submit hit-testing confirms the button receives the tap.
