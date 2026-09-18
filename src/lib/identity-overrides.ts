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
    "0x0a719f84fb1728f9e6fe7f34d9f730c6c46bbebb",
    {
      name: "mleejr",
      avatar:
        "https://pbs.twimg.com/profile_images/1601094719525855232/aOkAPHtC_400x400.png",
    },
  ],
  [
    "0xce370ebcbc655f845df7dfb8c079e75b5ea17d93",
    {
      name: "0xDeployer",
      avatar:
        "https://pbs.twimg.com/profile_images/2080340429426565120/NSSkGo98_400x400.jpg",
    },
  ],
  [
    "0x10cfd989637f004278db27f9f627239879a18019",
    {
      name: "garyvee",
      avatar:
        "https://pbs.twimg.com/profile_images/1658127153450328068/G4GOSuZB_400x400.jpg",
    },
  ],
  [
    "0xf68d7c8ff22f765e93e4441f1a66e5d3a9ac6318",
    {
      name: "jason",
      avatar:
        "https://pbs.twimg.com/profile_images/1828870492633104384/o37xorx4_400x400.jpg",
    },
  ],
  [
    "0x7ba77939f699936d2fcb970cb9f6c62b34222dda",
    {
      name: "stoolpresidente",
      avatar:
        "https://pbs.twimg.com/profile_images/2031028919751573504/m_4Tu1Hv_400x400.jpg",
    },
  ],
  [
    "0xf9da3ecc6ef927474b9f98be35f68a323b175424",
    {
      name: "blknoiz06",
      avatar:
        "https://pbs.twimg.com/profile_images/2052070109758226438/xlyPdLmn_400x400.jpg",
    },
  ],
  [
    "0x8651a6da9f6d5f9c1334ce28ee1ada82a3c9dc63",
    {
      name: "Dylan_Steck",
      avatar:
        "https://pbs.twimg.com/profile_images/1701427533995204608/QaqoVW2r_400x400.jpg",
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
