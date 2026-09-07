import { createThirdwebClient } from "thirdweb";
import { getSocialProfiles } from "thirdweb/social";
import { resolveScheme } from "thirdweb/storage";

import { resolveNftImageUrl } from "@/lib/resolve-nft-image";

export interface PickemImageProfile {
  name: string;
  avatar?: string;
}

/** Match the app's ENS → Farcaster → Lens display-profile preference. */
export async function resolvePickemImageProfile(
  address: string,
): Promise<PickemImageProfile> {
  const fallback = { name: `${address.slice(0, 6)}…${address.slice(-4)}` };
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const lookup = async (): Promise<PickemImageProfile> => {
    const client = createThirdwebClient({ clientId });
    const profiles = await getSocialProfiles({
      address,
      client,
    });
    const profile =
      profiles.find(p => p.type === "ens") ??
      profiles.find(p => p.type === "farcaster") ??
      profiles.find(p => p.type === "lens");
    const avatar =
      (await resolveNftImageUrl(profile?.avatar, client)) ?? profile?.avatar;
    return {
      name: profile?.name?.trim() || fallback.name,
      avatar: avatar ? resolveScheme({ client, uri: avatar }) : undefined,
    };
  };
  try {
    return await Promise.race([
      lookup().catch(() => fallback),
      new Promise<PickemImageProfile>(resolve => {
        timer = setTimeout(() => resolve(fallback), 2500);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
