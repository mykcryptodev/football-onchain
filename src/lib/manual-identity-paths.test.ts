import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

// Keep provider/React mocks isolated from the rest of the test suite.
test("mleejr reaches profile, share, Bankr and owner UI without provider lookups", () => {
  const child = spawnSync(
    process.execPath,
    [
      "--eval",
      `
import assert from "node:assert/strict";
import { mock } from "bun:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
const address = "0x0A719F84fb1728F9e6Fe7f34D9F730C6c46Bbebb";
const avatar = "https://pbs.twimg.com/profile_images/1601094719525855232/aOkAPHtC_400x400.png";
const neighbor = "0x0a719f84fb1728f9e6fe7f34d9f730c6c46bbebc";
const deployer = "0xCe370EbCBC655F845DF7DFb8C079E75B5EA17D93";
const unexpected = () => { throw new Error("Unexpected provider lookup"); };
let cacheReads = [];
mock.module("@/providers/Thirdweb", () => ({ client: {} }));
mock.module("thirdweb/social", () => ({ getSocialProfiles: unexpected }));
mock.module("@/lib/neynar", () => ({ fetchFarcasterBioByAddress: unexpected }));
mock.module("@/lib/redis", () => ({
  redis: {
    get: unexpected, setex: unexpected,
    mget: async (...keys) => { cacheReads.push(keys); return keys.map(() => []); },
  },
  CACHE_TTL: {}, getUserBioCacheKey: unexpected, getUserProfileCacheKey: unexpected,
  safeRedisOperation: unexpected,
}));
globalThis.fetch = unexpected;
const { GET } = await import("./src/app/api/user-profile/[address]/route.ts");
const { resolvePickemImageProfile } = await import("./src/lib/pickem-image-profile.ts");
const { resolveIdentities, resolveCreator } = await import("./src/lib/bankr/contest-description.ts");
let profile;
for (const input of [address, address.toLowerCase(), address.toUpperCase()]) {
  const response = await GET(new NextRequest("https://example.com/api/user-profile/" + input), { params: Promise.resolve({ address: input }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  profile = await response.json();
  assert.deepEqual(profile, { address: input, name: "mleejr", avatar });
  assert.deepEqual(await resolvePickemImageProfile(input), { name: "mleejr", avatar });
  assert.deepEqual(await resolveCreator(input), { address: input, displayName: "mleejr", source: "manual", avatar });
}
assert.deepEqual(cacheReads, [], "all-manual requests bypass Redis");
const batch = await resolveIdentities([address, deployer, neighbor, address]);
assert.deepEqual(batch.map(i => i.displayName), ["mleejr", "0xDeployer", "0x0a71…bebc", "mleejr"]);
assert.deepEqual(batch.map(i => i.address), [address, deployer, neighbor, address]);
assert.equal(batch[0].avatar, avatar);
assert.equal(batch[1].avatar, "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg");
assert.equal(batch[2].source, "wallet");
assert.equal(batch[2].avatar, undefined);
assert.deepEqual(cacheReads, [["bankr:creator:v1:" + neighbor]]);
// Use the real API output with the real owner component. Radix image loading
// and the query hook are the browser boundaries replaced for static rendering.
mock.module("@/hooks/useUserProfile", () => ({ useUserProfile: owner => {
  assert.equal(owner, address);
  return { profile };
} }));
mock.module("@/components/ui/avatar", () => ({
  Avatar: ({children}) => h("div", null, children),
  AvatarImage: ({src, alt}) => h("img", {src, alt}),
  AvatarFallback: () => null,
}));
mock.module("thirdweb/react", () => ({ AccountProvider: unexpected, AccountAvatar: unexpected, Blobbie: () => null }));
const { default: Owner } = await import("./src/components/pickem/PickemEntryOwner.tsx");
const html = renderToStaticMarkup(h(Owner, { owner: address }));
assert.ok(html.includes('src="' + avatar + '"'));
assert.ok(html.includes('alt="mleejr"'));
assert.ok(html.includes('>mleejr</a>'));
assert.equal(html.split('href="/profile/' + address + '"').length - 1, 2);
assert.ok(html.includes('href="https://basescan.org/address/' + address + '"'));
console.log("verified");
`,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 30000 },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), "verified");
});
