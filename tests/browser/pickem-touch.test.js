import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/postcss";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { build } from "esbuild";
import postcss from "postcss";

// Opt-in: the ordinary unit suite must not download/launch browsers.
const browserTest = process.env.PICKEM_BROWSER_TEST ? test : test.skip;
let browser, server, url;
const pageErrors = [];
const root = resolve(process.env.PICKEM_SOURCE_ROOT || ".");
const fixture = resolve("tests/browser/pickem-fixture.jsx");
const stubbed =
  /^(thirdweb\/react|thirdweb$|next\/navigation|next\/link|next-themes|@tanstack\/react-query|@\/hooks\/(useWeekGames|useOwnedPickemEntries|useFormattedCurrency|useBalanceRefresh|usePickemContract|useFarcasterContext)|@\/providers\/(Thirdweb|DisplayTokenProvider)|@\/components\/pickem\/)/;

beforeAll(async () => {
  if (!process.env.PICKEM_BROWSER_TEST) return;
  const playwright = await import(
    process.env.PLAYWRIGHT_MODULE || "playwright"
  );
  const engine = process.env.BROWSER || "chromium";
  browser = await playwright[engine].launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const bundle = await build({
    entryPoints: [fixture],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"test"' },
    plugins: [
      {
        name: "fixture-boundaries",
        setup(b) {
          b.onResolve({ filter: /^\.\.\/\.\.\/src\// }, args => ({
            path: resolve(root, args.path.replace("../../", "")) + ".tsx",
          }));
          b.onResolve({ filter: stubbed }, () => ({ path: fixture }));
          b.onResolve({ filter: /^@\/lib\/utils$/ }, () => ({
            path: "utils",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents:
              'export function cn(...v) { return v.filter(Boolean).join(" "); } export function toCaip19() { return "fixture"; }',
          }));
          b.onResolve({ filter: /^@\// }, async args => {
            return b.resolve(resolve(root, "src", args.path.slice(2)), {
              kind: args.kind,
              resolveDir: root,
            });
          });
        },
      },
    ],
  });
  const css = await postcss([tailwindcss({ base: root })]).process(
    await readFile(resolve(root, "src/app/globals.css"), "utf8"),
    { from: resolve(root, "src/app/globals.css") },
  );
  server = createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/app.js" ? "text/javascript" : "text/html",
    );
    res.end(
      req.url === "/app.js"
        ? bundle.outputFiles[0].text
        : `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css.css}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>`,
    );
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${server.address().port}`;
}, 120000);
afterAll(async () => {
  await browser?.close();
  server?.close();
  expect(pageErrors).toEqual([]);
});

async function open({ desktop = false, wallet = "coinbase", query = "" } = {}) {
  const context = await browser.newContext({
    viewport: desktop
      ? { width: 1365, height: 900 }
      : { width: 390, height: 664 },
    hasTouch: !desktop,
    isMobile: !desktop,
  });
  await context.route("**/*", route =>
    route.request().url().startsWith(url) ? route.continue() : route.abort(),
  );
  await context.addInitScript(
    ({ wallet }) => {
      window.bridgeMessages = [];
      if (wallet === "coinbase")
        window.ReactNativeWebView = {
          postMessage: message =>
            window.bridgeMessages.push(JSON.parse(message)),
        };
      window.ethereum = {
        isCoinbaseWallet: wallet === "coinbase",
        isCoinbaseBrowser: wallet === "coinbase",
        isMetaMask: wallet === "metamask",
        request: async ({ method }) => {
          if (method === "eth_sendTransaction")
            throw new Error("User rejected the request (test stub)");
          if (method === "eth_accounts")
            return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return "0x2105";
          throw new Error(`Unexpected RPC ${method}`);
        },
      };
    },
    { wallet },
  );
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`${url}/?${query}`);
  await page.getByRole("heading", { name: "Regular Season Week 2" }).waitFor();
  if (!query.includes("closed"))
    await page.getByText("Start a new draft", { exact: false }).waitFor();
  return { page, context };
}
async function pickAll(page) {
  for (const id of [101, 102, 103, 104])
    await page.getByLabel(`Pick Home ${id}`, { exact: true }).check();
}

browserTest(
  "actual mobile Review link scrolls to review with an unanswered Coinbase bridge",
  async () => {
    const { page, context } = await open();
    try {
      await pickAll(page);
      const review = page.getByRole("link", {
        name: "Review & enter",
        exact: true,
      });
      await review.tap();
      await page.waitForTimeout(1000);
      expect(
        await page
          .locator("#review-picks")
          .evaluate(el => el.getBoundingClientRect().top),
      ).toBeLessThan(300);
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(0);
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await review.tap();
      await page.waitForTimeout(1000);
      expect(
        await page
          .locator("#review-picks")
          .evaluate(el => el.getBoundingClientRect().top),
      ).toBeLessThan(300);
    } finally {
      await context.close();
    }
  },
);

for (const scenario of [
  { wallet: "coinbase" },
  { wallet: "metamask" },
  { wallet: "metamask", desktop: true },
  { wallet: "coinbase", query: "nativeHaptic=pending" },
  { wallet: "coinbase", query: "nativeHaptic=reject" },
]) {
  browserTest(
    `actual Submit dispatches without a haptic reply: ${JSON.stringify(scenario)}`,
    async () => {
      const { page, context } = await open(scenario);
      try {
        await pickAll(page);
        await page
          .getByLabel("Tiebreaker: Total Points", { exact: true })
          .fill("45");
        const submit = page.getByRole("button", {
          name: "Submit picks · 1 USDC",
          exact: true,
        });
        expect(await submit.isEnabled()).toBe(true);
        await submit.scrollIntoViewIfNeeded();
        expect(
          await submit.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              ),
            );
          }),
        ).toBe(true);
        if (
          process.env.PICKEM_SCREENSHOT &&
          scenario.wallet === "coinbase" &&
          !scenario.query
        ) {
          await page.screenshot({ path: process.env.PICKEM_SCREENSHOT });
        }
        if (scenario.desktop) await submit.click();
        else await submit.tap();
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(1);
        await page
          .getByText(
            "You cancelled the wallet request. Your picks are still here.",
          )
          .waitFor({ timeout: 1000 });
      } finally {
        await context.close();
      }
    },
  );
}

browserTest(
  "Review still scrolls when native fragment navigation is suppressed by a host",
  async () => {
    const { page, context } = await open();
    try {
      await pickAll(page);
      await page.evaluate(() => {
        // Fault injection: a host intercepts fragment navigation. This is NOT
        // a claim that physical Coinbase always intercepts fragments.
        document.addEventListener(
          "click",
          event => {
            if (event.target.closest('a[href^="#"]')) event.preventDefault();
          },
          true,
        );
        scrollTo({ top: 0, behavior: "instant" });
      });
      await page
        .getByRole("link", { name: "Review & enter", exact: true })
        .tap();
      await page.waitForTimeout(1000);
      const top = await page
        .locator("#review-picks")
        .evaluate(el => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(128);
      expect(top).toBeLessThan(300);
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(0);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "Button consumer receives currentTarget synchronously while haptics is pending",
  async () => {
    const { page, context } = await open();
    try {
      await page.locator("#sync-handler").tap();
      expect(await page.evaluate(() => window.syncCurrentTarget)).toBe(
        "sync-handler",
      );
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "Next unpicked scrolls; reduced motion and short touch viewport remain usable",
  async () => {
    const { page, context } = await open();
    try {
      await page.setViewportSize({ width: 375, height: 480 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("link", { name: "Next unpicked game" }).tap();
      expect(
        await page
          .locator("#game-101")
          .evaluate(el => el.getBoundingClientRect().top),
      ).toBeLessThan(300);
      await pickAll(page);
      await page
        .getByRole("link", { name: "Review & enter", exact: true })
        .tap();
      await page
        .getByLabel("Tiebreaker: Total Points", { exact: true })
        .fill("45");
      const submit = page.getByRole("button", {
        name: "Submit picks · 1 USDC",
        exact: true,
      });
      await submit.tap();
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(1);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "Incomplete picks and invalid tiebreakers remain disabled",
  async () => {
    const { page, context } = await open();
    try {
      expect(
        await page
          .getByRole("button", { name: "Complete All Picks" })
          .isDisabled(),
      ).toBe(true);
      await pickAll(page);
      const score = page.getByLabel("Tiebreaker: Total Points", {
        exact: true,
      });
      for (const value of ["", "-1", "1.5", "9007199254740992"]) {
        await score.fill(value);
        expect(
          await page
            .getByRole("button", { name: "Add a tiebreaker score" })
            .isDisabled(),
        ).toBe(true);
      }
      await score.fill("0");
      expect(
        await page
          .getByRole("button", { name: "Submit picks · 1 USDC", exact: true })
          .isEnabled(),
      ).toBe(true);
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(0);
    } finally {
      await context.close();
    }
  },
);

for (const query of [
  "gamesLoading",
  "gamesError",
  "missingGame",
  "balanceLoading",
  "balanceError",
  "poor",
  "guest",
  "closed",
]) {
  browserTest(`Contest guards do not dispatch: ${query}`, async () => {
    const { page, context } = await open({ query });
    try {
      if (["gamesLoading", "gamesError", "missingGame"].includes(query)) {
        await pickAllAvailable(page);
        await page
          .getByLabel("Tiebreaker: Total Points", { exact: true })
          .fill("45");
        const submit = page.getByRole("button", {
          name: /Submit picks ·|Complete All Picks/,
        });
        expect(await submit.isDisabled()).toBe(true);
      } else {
        expect(
          await page.getByRole("button", { name: /^Submit picks ·/ }).count(),
        ).toBe(0);
      }
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(0);
    } finally {
      await context.close();
    }
  });
}
async function pickAllAvailable(page) {
  for (const radio of await page
    .getByRole("radio", { name: /^Pick Home/ })
    .all())
    await radio.check();
}

browserTest(
  "Submitting disables both repeat entry and editing; synchronous lock prevents duplicates",
  async () => {
    const { page, context } = await open({ query: "holdSubmission" });
    try {
      await pickAll(page);
      await page
        .getByLabel("Tiebreaker: Total Points", { exact: true })
        .fill("45");
      const submit = page.getByRole("button", {
        name: "Submit picks · 1 USDC",
        exact: true,
      });
      await submit.tap();
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(1);
      expect(
        await page
          .getByLabel("Tiebreaker: Total Points", { exact: true })
          .isDisabled(),
      ).toBe(true);
      expect(
        await page.getByLabel("Pick Home 101", { exact: true }).isDisabled(),
      ).toBe(true);
      expect(
        await page
          .locator('#review-picks button[data-slot="button"]')
          .isDisabled(),
      ).toBe(true);
      await page
        .locator('#review-picks button[data-slot="button"]')
        .dispatchEvent("click");
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(1);
    } finally {
      await context.close();
    }
  },
);

browserTest(
  "Deadline is rechecked inside the handler before any submission",
  async () => {
    const { page, context } = await open();
    try {
      await pickAll(page);
      await page
        .getByLabel("Tiebreaker: Total Points", { exact: true })
        .fill("45");
      // Advance Date.now and dispatch in one task, before the UI's interval
      // closes the form: exercise the handler's guard, not only render gating.
      await page
        .getByRole("button", {
          name: "Submit picks · 1 USDC",
          exact: true,
        })
        .evaluate(button => {
          const now = Date.now();
          Date.now = () => now + 7200000;
          button.click();
        });
      await page
        .getByText("This contest is now closed. Your draft was not entered.")
        .waitFor();
      expect(await page.evaluate(() => window.submitAttempts || 0)).toBe(0);
    } finally {
      await context.close();
    }
  },
);
