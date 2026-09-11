"use client";

import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

const MAX_VISIBLE = 9;

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Same resolution order as PickemEntryOwner: profile avatar, then thirdweb's
// account avatar, then a Blobbie. `className` sets the size.
export function PickerAvatar({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const { profile } = useUserProfile(address);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const label = profile?.name?.trim() || shortAddress(address);
  const fallback = (
    <Blobbie address={address} className="size-full rounded-full" />
  );

  return (
    // relative + isolate puts every avatar on the same stacking layer, so
    // overlap follows DOM order (rightmost on top). Radix's Avatar root is
    // positioned and Blobbie isn't, which otherwise flips the order.
    <span
      title={label}
      className={cn(
        "relative isolate block shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      {avatarUrl ? (
        <Avatar className="size-full">
          <AvatarImage alt={label} src={avatarUrl} />
          <AvatarFallback className="bg-transparent p-0">
            {fallback}
          </AvatarFallback>
        </Avatar>
      ) : (
        <AccountProvider address={address} client={client}>
          <AccountAvatar
            className="size-full rounded-full"
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
      <div className="flex -space-x-2">
        {addresses.slice(0, MAX_VISIBLE).map(address => (
          <PickerAvatar
            key={address}
            address={address}
            className="size-5 ring-2 ring-background"
          />
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
