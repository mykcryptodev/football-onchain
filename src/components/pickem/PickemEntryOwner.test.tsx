import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let profile: { name?: string; avatar?: string } | null = null;
let lookedUpAddress: string | null = null;

mock.module("@/hooks/useUserProfile", () => ({
  useUserProfile: (address: string) => {
    lookedUpAddress = address;
    return { profile, isLoading: !profile, error: null };
  },
}));
mock.module("@/providers/Thirdweb", () => ({ client: {} }));
mock.module("@/lib/utils", () => ({
  resolveAvatarUrl: (avatar?: string) => avatar || null,
}));
mock.module("thirdweb/react", () => ({
  AccountProvider: ({ children }: { children: ReactNode }) => children,
  AccountAvatar: ({ fallbackComponent }: { fallbackComponent: ReactNode }) =>
    fallbackComponent,
  Blobbie: ({ address }: { address: string }) => (
    <span data-fallback-address={address} />
  ),
}));
// Radix waits for browser image loading; expose the supplied image props for SSR assertions.
mock.module("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ alt, src }: { alt: string; src: string }) => (
    <span data-avatar-alt={alt} data-avatar-src={src} />
  ),
  AvatarFallback: ({ children }: { children: ReactNode }) => children,
}));

const { default: PickemEntryOwner } = await import("./PickemEntryOwner");
const owner = "0x1234567890123456789012345678901234567890";
const nextOwner = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

beforeEach(() => {
  profile = null;
  lookedUpAddress = null;
});

describe("current entry owner identity", () => {
  test("renders resolved name and avatar for the owner, linking to their profile and the explorer", () => {
    profile = { name: "  myk.eth  ", avatar: "https://example.com/avatar.png" };
    const html = renderToStaticMarkup(<PickemEntryOwner owner={owner} />);
    expect(lookedUpAddress).toBe(owner);
    expect(html).toContain("Current owner");
    expect(html).toContain("myk.eth");
    expect(html).toContain('data-avatar-src="https://example.com/avatar.png"');
    expect(html).toContain(`href="https://basescan.org/address/${owner}"`);
    expect(html).toContain(`title="${owner}"`);
    // Avatar and name both link to the player profile page.
    expect(html.split(`href="/profile/${owner}"`).length - 1).toBe(2);
    expect(html).toContain("0x1234…7890");
  });

  test("unresolved or failed profile lookup retains address and avatar fallback", () => {
    const html = renderToStaticMarkup(<PickemEntryOwner owner={owner} />);
    expect(html).toContain("0x1234…7890");
    expect(html).toContain(`data-fallback-address="${owner}"`);
    expect(html).not.toContain("data-avatar-src");
  });

  test("blank names fall back to the address even when an avatar exists", () => {
    profile = { name: "   ", avatar: "https://example.com/avatar.png" };
    const html = renderToStaticMarkup(<PickemEntryOwner owner={owner} />);
    expect(html).toContain('data-avatar-alt="0x1234…7890"');
    expect(html).toMatch(/font-medium[^>]*>0x1234…7890<\/a>/);
  });

  test("ownership changes use the new address rather than the original entrant", () => {
    renderToStaticMarkup(<PickemEntryOwner owner={owner} />);
    profile = { name: "New owner" };
    const html = renderToStaticMarkup(<PickemEntryOwner owner={nextOwner} />);
    expect(lookedUpAddress).toBe(nextOwner);
    expect(html).toContain("New owner");
    expect(html).toContain(`href="https://basescan.org/address/${nextOwner}"`);
    expect(html).toContain(`href="/profile/${nextOwner}"`);
    expect(html).not.toContain(owner);
  });
});
