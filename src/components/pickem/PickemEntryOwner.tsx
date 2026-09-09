"use client";

import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

export default function PickemEntryOwner({ owner }: { owner: string }) {
  const { profile } = useUserProfile(owner);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const name = profile?.name?.trim();
  const shortAddress = `${owner.slice(0, 6)}…${owner.slice(-4)}`;
  const fallback = <Blobbie address={owner} className="size-9 rounded-full" />;

  return (
    <div className="flex items-center gap-3 text-sm">
      {avatarUrl ? (
        <Avatar className="size-9 shrink-0">
          <AvatarImage alt={name || shortAddress} src={avatarUrl} />
          <AvatarFallback className="bg-transparent p-0">
            {fallback}
          </AvatarFallback>
        </Avatar>
      ) : (
        <AccountProvider address={owner} client={client}>
          <AccountAvatar
            className="size-9 shrink-0 rounded-full"
            fallbackComponent={fallback}
          />
        </AccountProvider>
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground">Current owner</p>
        <a
          className="block break-all underline-offset-4 hover:underline"
          href={`https://basescan.org/address/${owner}`}
          rel="noopener noreferrer"
          target="_blank"
          title={owner}
        >
          <span className="font-medium">{name || shortAddress}</span>
          {name && (
            <span className="ml-2 text-muted-foreground">{shortAddress}</span>
          )}
        </a>
      </div>
    </div>
  );
}
