/**
 * Narrow, application-wide display-only identity overrides.
 *
 * These entries are NOT verified ENS/Farcaster records and carry no
 * ownership, payout, authentication, or wallet-linking semantics.
 * They affect only the name and avatar shown in UI surfaces.
 *
 * Keys are lowercase hex addresses (0x…). Lookup is case-insensitive.
 */

export interface IdentityOverride {
  /** Display name shown instead of the resolved ENS/Farcaster name. */
  name: string;
  /** HTTPS avatar URL shown instead of the resolved social avatar. */
  avatar: string;
}

const OVERRIDES = new Map<string, IdentityOverride>([
  [
    "0xce370ebcbc655f845df7dfb8c079e75b5ea17d93",
    {
      name: "0xDeployer",
      avatar:
        "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg",
    },
  ],
]);

/**
 * Returns the override for `address`, or `undefined` if none exists.
 * Lookup is case-insensitive.
 */
export function getIdentityOverride(
  address: string,
): IdentityOverride | undefined {
  return OVERRIDES.get(address.toLowerCase());
}
