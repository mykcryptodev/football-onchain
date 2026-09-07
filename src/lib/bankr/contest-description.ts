import { createThirdwebClient } from "thirdweb";
import { getSocialProfiles } from "thirdweb/social";

import { redis } from "@/lib/redis";

type Profile = Awaited<ReturnType<typeof getSocialProfiles>>[number];
export type CreatorIdentity = {
  address: string;
  displayName: string;
  source: "ens" | "farcaster" | "lens" | "wallet";
};

const clean = (value: unknown): string | null =>
  typeof value === "string" &&
  value.length <= 128 &&
  value.trim().length > 0 &&
  !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)
    ? value.trim()
    : null;

export function creatorIdentity(
  address: string,
  profiles: readonly Profile[],
): CreatorIdentity {
  const fallback: CreatorIdentity = {
    address,
    displayName: `${address.slice(0, 6)}…${address.slice(-4)}`,
    source: "wallet",
  };
  for (const type of ["ens", "farcaster", "lens"] as const) {
    const names = profiles
      .filter(p => p.type === type)
      .flatMap(p => {
        const metadata = p.metadata as Record<string, unknown> | undefined;
        // Do not use a profile explicitly associated with a different wallet.
        if (
          type === "ens" &&
          typeof metadata?.address === "string" &&
          metadata.address.toLowerCase() !== address.toLowerCase()
        )
          return [];
        const name = clean(type === "farcaster" ? metadata?.username : p.name);
        if (!name) return [];
        if (type === "farcaster" && !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name))
          return [];
        if (type === "ens" && (!name.includes(".") || /\s/.test(name)))
          return [];
        return [name];
      });
    const unique = [...new Set(names)];
    // Multiple profiles of the same type are ambiguous; don't choose arbitrarily.
    if (unique.length !== 1) continue;
    const name = unique[0];
    return {
      address,
      displayName:
        type === "farcaster"
          ? `@${name} (Farcaster)`
          : type === "lens"
            ? `${name} (Lens)`
            : name,
      source: type,
    };
  }
  return fallback;
}

export function contestDescription(
  contest: { weekNumber: number; seasonType: number; year: bigint },
  creator: CreatorIdentity,
  entryFee: string,
  symbol: string,
) {
  const seasonLabel =
    (
      { 1: "preseason", 2: "regular season", 3: "postseason" } as Record<
        number,
        string
      >
    )[contest.seasonType] ?? `season type ${contest.seasonType}`;
  return {
    season: {
      week: contest.weekNumber,
      type: contest.seasonType,
      year: Number(contest.year),
      label: seasonLabel,
    },
    creator,
    summary: `Week ${contest.weekNumber} of the ${seasonLabel} (${contest.year}), created by ${creator.displayName}, for ${entryFee} ${symbol} per entry.`,
  };
}

// One small, optional enrichment: no bios, avatars, or extra social API calls.
export async function resolveCreator(
  address: string,
): Promise<CreatorIdentity> {
  const fallback = creatorIdentity(address, []);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const lookup = async () => {
    const key = `bankr:creator:v1:${address.toLowerCase()}`;
    const cached = await redis?.get<Profile[]>(key);
    if (Array.isArray(cached)) return creatorIdentity(address, cached);
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
    if (!clientId) return fallback;
    const profiles = await getSocialProfiles({
      address,
      client: createThirdwebClient({ clientId }),
    });
    const identity = creatorIdentity(address, profiles);
    // Cache only the identity fields used here, never profile bios or contact data.
    const minimal = profiles.map(({ type, name, metadata }) => ({
      type,
      name,
      metadata: metadata && {
        address: "address" in metadata ? metadata.address : undefined,
        username: "username" in metadata ? metadata.username : undefined,
      },
    }));
    await redis
      ?.setex(key, identity.source === "wallet" ? 60 : 900, minimal)
      .catch(() => undefined);
    return identity;
  };
  try {
    return await Promise.race([
      lookup().catch(() => fallback),
      new Promise<CreatorIdentity>(resolve => {
        timer = setTimeout(() => resolve(fallback), 1500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
