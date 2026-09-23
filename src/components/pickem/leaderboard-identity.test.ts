import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, test } from "node:test";

const deployer = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const other = "0xce370ebcbc655f845df7dfb8c079e75b5ea17d94";
const avatar =
  "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg";

// Render the actual table components, not copied JSX or an identity helper.
// Seed their loaded state and stub external providers; isolate module mocks in
// a child so they cannot contaminate the profile/Bankr suites (or vice versa).
function renderTable(
  component: string,
  address: string,
  activeAddress: string,
  neighbor: string = other,
) {
  const child = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import { mock } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { createElement: h, createContext, useContext } = React;
const component = ${JSON.stringify(component)};
const address = ${JSON.stringify(address)};
const other = ${JSON.stringify(neighbor)};
const activeAddress = ${JSON.stringify(activeAddress)};
const entries = [address, other].map((owner, i) => ({
  tokenId: i + 10, owner, address: owner,
  originalPredictor: i === 0 ? other : address,
  picks: [1], correctPicks: 1, totalGames: 1,
  tiebreakerPoints: 42, submissionTime: 0, rank: i + 1,
  liveRank: i + 1, liveCorrectPicks: 1, liveTotalScoredGames: 1,
  prize: 100n,
}));
const states = component === "ContestPicksView"
  ? [true, entries, [], [], false, new Set(), false, new Map()]
  : [entries, false, 1000n, "USDC", [1000n]];
let index = 0;
mock.module("react", () => ({
  ...React,
  useState: () => {
    if (index >= states.length) throw new Error("Unexpected state hook");
    return [states[index++], () => {}];
  },
  useEffect: () => {},
}));
const Address = createContext("");
const calls = { names: [], avatars: [], providers: [] };
const thirdweb = await import("thirdweb");
mock.module("thirdweb", () => ({ ...thirdweb, createThirdwebClient: () => ({}) }));
mock.module("thirdweb/react", () => ({
  useActiveAccount: () => ({ address: activeAddress }),
  AccountProvider: ({ address, children }) => {
    calls.providers.push(address);
    return h(Address.Provider, { value: address }, children);
  },
  AccountAvatar: ({ className, style }) => {
    const address = useContext(Address);
    calls.avatars.push(address);
    return h("img", { className, style, src: "https://example.com/fallback.png", alt: "thirdweb:" + address });
  },
  AccountName: ({ className, fallbackComponent }) => {
    const address = useContext(Address);
    calls.names.push(address);
    return h("span", { className }, fallbackComponent);
  },
  AccountAddress: ({ className, formatFn }) => h("span", { className }, formatFn(useContext(Address).toLowerCase())),
  Blobbie: ({ address }) => h("span", { "data-blobbie": address }),
}));
// next/link has its own state hooks, which would consume the fixture above.
mock.module("next/link", () => ({
  default: ({ href, className, children }) => h("a", { href, className }, children),
}));
mock.module("@/providers/Thirdweb", () => ({ client: {} }));
mock.module("@/hooks/usePickemContract", () => ({ usePickemContract: () => ({}) }));
mock.module("@/hooks/usePickemNFT", () => ({ usePickemNFT: () => ({}) }));
mock.module("@/hooks/useFormattedCurrency", () => ({
  useFormattedCurrency: ({ amount }) => ({ formattedValue: String(amount) + " USDC", isLoading: false }),
}));
// Radix Dialog portals require a browser; keep its content inline for SSR.
mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children }) => h("div", null, children),
  DialogContent: ({ children, className }) => h("div", { className }, children),
  DialogHeader: ({ children }) => h("header", null, children),
  DialogTitle: ({ children }) => h("h2", null, children),
}));
globalThis.fetch = () => { throw new Error("Rendering must not need a profile API"); };
const { default: Component } = await import("./src/components/pickem/" + component + ".tsx");
const html = renderToStaticMarkup(h(Component, {
  contestId: 42, onClose: () => {}, gameIds: ["1"], gamesFinalized: false,
  year: 2026, seasonType: 2, weekNumber: 1, tiebreakerGameId: "1",
}));
if (index !== states.length) throw new Error("State fixture drift");
console.log(JSON.stringify({ html, calls }));
`,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 30000 },
  );
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout) as {
    html: string;
    calls: { names: string[]; avatars: string[]; providers: string[] };
  };
}

for (const component of ["ContestPicksView", "PickemLeaderboard"]) {
  describe(`${component} rendered identity`, () => {
    for (const identity of [
      {
        address: deployer,
        name: "0xDeployer",
        avatar,
        neighbor: other,
        short: "0xCe37",
      },
      {
        address: "0x0A719F84fb1728F9e6Fe7f34D9F730C6c46Bbebb",
        name: "mleejr",
        avatar:
          "https://pbs.twimg.com/profile_images/1601094719525855232/aOkAPHtC_400x400.png",
        neighbor: "0x0a719f84fb1728f9e6fe7f34d9f730c6c46bbebc",
        short: "0x0A71",
      },
    ]) {
      for (const address of [
        identity.address,
        identity.address.toLowerCase(),
        identity.address.toUpperCase(),
      ]) {
        test(`renders exact manual name/avatar for ${address} without thirdweb identity lookup`, () => {
          const { html, calls } = renderTable(
            component,
            address,
            identity.neighbor,
            identity.neighbor,
          );
          const rows = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(
            match => match[0],
          );
          const row = rows.find(value => value.includes(identity.name));
          assert.ok(row, "The actual table row must show the override name");
          assert.match(
            row,
            new RegExp(
              `src="${identity.avatar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
            ),
          );
          assert.ok(row.includes(`alt="${identity.name}"`));
          assert.doesNotMatch(row, />You<|verified|farcaster|\.eth/i);
          assert.match(row, /42/); // Tiebreaker is unchanged.
          // Name/avatar link to the entrant's entry page for this contest.
          assert.ok(row.includes('href="/pickem/42/entries/10"'));
          if (component === "PickemLeaderboard") {
            assert.match(row, /NFT #10/);
            assert.match(row, /Transferred from/);
            assert.match(row, /100 USDC/);
          } else {
            assert.ok(row.includes(identity.short)); // Secondary wallet address remains visible.
          }
          assert.deepEqual(calls.names, [identity.neighbor]);
          assert.deepEqual(calls.avatars, [identity.neighbor]);
          assert.deepEqual(calls.providers, [address, identity.neighbor]);
          const otherRow = rows.find(value =>
            value.includes("thirdweb:" + identity.neighbor),
          );
          assert.ok(otherRow);
          assert.match(otherRow, />You</);
          assert.doesNotMatch(otherRow, /0xDeployer|mleejr|pbs\.twimg/);
        });
      }
    }

    test("preserves nonmatching wallet name/avatar fallback and address-based You marker", () => {
      const unrelated = "0x1234567890123456789012345678901234567890";
      const { html, calls } = renderTable(
        component,
        unrelated,
        unrelated.toUpperCase(),
      );
      assert.deepEqual(calls.names, [unrelated, other]);
      assert.deepEqual(calls.avatars, [unrelated, other]);
      assert.match(html, /0x1234/);
      assert.match(html, />You</);
      assert.doesNotMatch(html, /0xDeployer|mleejr|pbs\.twimg/);
    });
  });
}
