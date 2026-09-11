"use client";

import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

const MAX_VISIBLE = 3;

// Same resolution order as PickemEntryOwner: profile avatar, then thirdweb's
// account avatar, then a Blobbie.
function PickerAvatar({ address }: { address: string }) {
  const { profile } = useUserProfile(address);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const label =
    profile?.name?.trim() || `${address.slice(0, 6)}…${address.slice(-4)}`;
  const fallback = (
    <Blobbie address={address} className="size-5 rounded-full" />
  );

  return (
    <span
      className="block size-5 shrink-0 overflow-hidden rounded-full ring-2 ring-background"
      title={label}
    >
      {avatarUrl ? (
        <Avatar className="size-5">
          <AvatarImage alt={label} src={avatarUrl} />
          <AvatarFallback className="bg-transparent p-0">
            {fallback}
          </AvatarFallback>
        </Avatar>
      ) : (
        <AccountProvider address={address} client={client}>
          <AccountAvatar
            className="size-5 rounded-full"
            fallbackComponent={fallback}
          />
        </AccountProvider>
      )}
    </span>
  );
}

/** Overlapping avatars of the other wallets that picked a team. */
export default function PickerAvatars({ addresses }: { addresses: string[] }) {
  if (addresses.length === 0) return null;
  const overflow = addresses.length - MAX_VISIBLE;

  return (
    <div
      aria-label={`${addresses.length} other ${addresses.length === 1 ? "player" : "players"} picked this team`}
      className="flex shrink-0 items-center"
    >
      <div className="flex -space-x-1.5">
        {addresses.slice(0, MAX_VISIBLE).map(address => (
          <PickerAvatar key={address} address={address} />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
