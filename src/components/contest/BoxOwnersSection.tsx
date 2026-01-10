"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useMemo, useState } from "react";
import { ZERO_ADDRESS } from "thirdweb";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { chain, contests } from "@/constants";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { client } from "@/providers/Thirdweb";

import type { BoxOwner, Contest } from "./types";

interface BoxOwnersSectionProps {
  contest: Contest;
  boxOwners: BoxOwner[];
}

interface BoxOwnerEntry {
  address: string;
  boxTokenIds: number[];
}

interface OwnerItemProps {
  owner: BoxOwnerEntry;
  contest: Contest;
  onClick: () => void;
}

function OwnerItem({ owner, contest, onClick }: OwnerItemProps) {
  const { profile } = useUserProfile(owner.address);

  return (
    <button
      className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-3 text-left hover:bg-muted/50 transition"
      type="button"
      onClick={onClick}
    >
      <AccountProvider address={owner.address} client={client}>
        <AccountAvatar
          fallbackComponent={
            <Blobbie address={owner.address} className="size-9 rounded-full" />
          }
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "100%",
          }}
        />
      </AccountProvider>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {profile?.name || owner.address}
        </div>
        <div className="text-xs text-muted-foreground">
          {owner.boxTokenIds.length} box
          {owner.boxTokenIds.length === 1 ? "" : "es"}
        </div>
      </div>
    </button>
  );
}

export function BoxOwnersSection({
  contest,
  boxOwners,
}: BoxOwnersSectionProps) {
  const [selectedOwner, setSelectedOwner] = useState<BoxOwnerEntry | null>(
    null,
  );
  const contestAddress = contests[chain.id].toLowerCase();
  const { isInMiniApp } = useFarcasterContext();
  const { profile } = useUserProfile(selectedOwner?.address ?? null);

  const owners = useMemo(() => {
    const ownerMap = new Map<string, BoxOwnerEntry>();

    boxOwners.forEach(box => {
      const ownerAddress = box.owner.toLowerCase();
      if (ownerAddress === ZERO_ADDRESS.toLowerCase()) return;
      if (ownerAddress === contestAddress) return;

      const existing = ownerMap.get(ownerAddress);
      if (existing) {
        existing.boxTokenIds.push(box.tokenId);
      } else {
        ownerMap.set(ownerAddress, {
          address: box.owner,
          boxTokenIds: [box.tokenId],
        });
      }
    });

    return Array.from(ownerMap.values()).sort(
      (a, b) => b.boxTokenIds.length - a.boxTokenIds.length,
    );
  }, [boxOwners, contestAddress]);

  const handleViewProfile = async () => {
    if (isInMiniApp && profile?.fid) {
      try {
        await sdk.actions.viewProfile({ fid: profile.fid });
      } catch (error) {
        console.error("Error viewing profile:", error);
      }
      return;
    }

    if (profile?.farcasterUsername) {
      window.open(
        `https://base.app/profile/${profile.farcasterUsername}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    console.warn("No Farcaster profile data available for this user");
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Box Owners</h2>
          <p className="text-sm text-muted-foreground">
            Tap an owner to view their profile and boxes.
          </p>
        </div>
        <Badge className="whitespace-nowrap" variant="secondary">
          {owners.length} owners
        </Badge>
      </div>

      {owners.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No boxes have been claimed yet.
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {owners.map(owner => (
              <OwnerItem
                key={owner.address}
                contest={contest}
                owner={owner}
                onClick={() => setSelectedOwner(owner)}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(selectedOwner)}
        onOpenChange={open => {
          if (!open) setSelectedOwner(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selectedOwner && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AccountProvider
                  address={selectedOwner.address}
                  client={client}
                >
                  <AccountAvatar
                    fallbackComponent={
                      <Blobbie
                        address={selectedOwner.address}
                        className="size-12 rounded-full"
                      />
                    }
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "100%",
                    }}
                  />
                </AccountProvider>
                <div className="min-w-0 flex-1">
                  {profile?.name ? (
                    <div className="text-base font-semibold truncate">
                      {profile.name}
                    </div>
                  ) : (
                    <div className="text-base font-semibold truncate font-mono">
                      {selectedOwner.address}
                    </div>
                  )}
                  {profile?.name && (
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {selectedOwner.address}
                    </div>
                  )}
                  {profile?.fid && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Farcaster ID: {profile.fid}
                    </div>
                  )}
                </div>
              </div>
              {profile?.bio && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}
              {(profile?.farcasterUsername ||
                (isInMiniApp && profile?.fid)) && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewProfile}
                  >
                    View Profile
                  </Button>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2">Boxes</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOwner.boxTokenIds.map(tokenId => (
                    <Badge key={tokenId} variant="secondary">
                      #{tokenId - contest.id * 100}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
