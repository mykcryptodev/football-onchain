"use client";

import Link from "next/link";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

export default function PickemEntryHeroIdentity({ owner }: { owner: string }) {
  const { profile } = useUserProfile(owner);
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const name = profile?.name?.trim();
  const shortAddress = `${owner.slice(0, 6)}…${owner.slice(-4)}`;
  const fallback = <Blobbie address={owner} className="size-12 rounded-full" />;
  const profileHref = `/profile/${owner}`;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        aria-label={`${name || shortAddress} profile`}
        className="shrink-0"
        href={profileHref}
      >
        {avatarUrl ? (
          <Avatar className="size-12 shrink-0">
            <AvatarImage alt={name || shortAddress} src={avatarUrl} />
            <AvatarFallback className="bg-transparent p-0">
              {fallback}
            </AvatarFallback>
          </Avatar>
        ) : (
          <AccountProvider address={owner} client={client}>
            <AccountAvatar
              className="size-12 shrink-0 rounded-full"
              fallbackComponent={fallback}
            />
          </AccountProvider>
        )}
      </Link>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-[#a8c6b4]">
          Current owner
        </p>
        <Link
          className="block truncate text-lg font-semibold text-[#f4f4e9] underline-offset-4 hover:underline"
          href={profileHref}
        >
          {name || shortAddress}
        </Link>
        <a
          className="text-xs text-[#a8c6b4] underline-offset-4 hover:underline"
          href={`https://basescan.org/address/${owner}`}
          rel="noopener noreferrer"
          target="_blank"
          title={owner}
        >
          {name ? shortAddress : "Basescan"}
        </a>
      </div>
    </div>
  );
}
