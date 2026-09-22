import identityOverrideEntries from "./identity-overrides.json";

/**
 * Narrow, application-wide display-only identity overrides.
 *
 * These entries are NOT verified ENS/Farcaster records and carry no
 * ownership, payout, authentication, or wallet-linking semantics.
 * They affect only the name and avatar shown in UI surfaces.
 *
 * `identity-overrides.json` is the single source of truth; this module
 * derives the map from it, so code and data cannot drift. Addresses are
 * lowercase hex (0x…). Lookup is case-insensitive.
 *
 * `xUsername` is the entrant's X handle without the leading @, curated by
 * us. Like the other fields it is display-only, but it gives automation
 * (e.g. the weekly winner announcement) an explicit handle instead of
 * guessing one from the display name.
 */

export interface IdentityOverride {
  /** Display name shown instead of the resolved ENS/Farcaster name. */
  name: string;
  /** HTTPS avatar URL shown instead of the resolved social avatar. */
  avatar: string;
  /** X username (no leading @) for this entrant, curated by us. */
  xUsername: string;
}

export interface IdentityOverrideEntry extends IdentityOverride {
  /** Lowercase hex wallet address this override applies to. */
  address: string;
}

export const IDENTITY_OVERRIDES: readonly IdentityOverrideEntry[] =
  identityOverrideEntries;

const OVERRIDES = new Map<string, IdentityOverride>(
  IDENTITY_OVERRIDES.map(({ address, name, avatar, xUsername }) => [
    address,
    { name, avatar, xUsername },
  ]),
);

/**
 * Returns the override for `address`, or `undefined` if none exists.
 * Lookup is case-insensitive.
 */
export function getIdentityOverride(
  address: string,
): IdentityOverride | undefined {
  return OVERRIDES.get(address.toLowerCase());
}
