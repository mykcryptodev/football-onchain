"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsInMiniApp } from "@/hooks/useIsInMiniApp";
import { useUserProfile } from "@/hooks/useUserProfile";
import { client } from "@/providers/Thirdweb";

interface UserProfileModalProps {
  address: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({
  address,
  open,
  onOpenChange,
}: UserProfileModalProps) {
  const { profile, isLoading } = useUserProfile(address);
  const { isInMiniApp } = useIsInMiniApp();

  const handleViewProfile = async () => {
    if (!profile?.fid) {
      console.warn("No FID available for this user");
      return;
    }

    if (isInMiniApp) {
      try {
        await sdk.actions.viewProfile({ fid: profile.fid });
        onOpenChange(false); // Close modal after opening profile
      } catch (error) {
        console.error("Error viewing profile:", error);
      }
    } else {
      // If not in mini app, could open Farcaster profile in new tab
      // For now, just show the modal
      console.log("Not in mini app, showing modal instead");
    }
  };

  if (!address) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            {isInMiniApp && profile?.fid
              ? "Click the button below to view this user's Farcaster profile"
              : "View user information"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <AccountProvider address={address} client={client}>
                <AccountAvatar
                  fallbackComponent={
                    <Blobbie
                      address={address}
                      className="size-20 rounded-full"
                    />
                  }
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "100%",
                  }}
                />
              </AccountProvider>

              {profile?.name && (
                <div className="text-center">
                  <div className="text-lg font-semibold">{profile.name}</div>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <div className="font-mono break-all">{address}</div>
              </div>

              {profile?.fid && (
                <div className="text-center text-sm text-muted-foreground">
                  <div>Farcaster ID: {profile.fid}</div>
                </div>
              )}

              {isInMiniApp && profile?.fid && (
                <Button className="mt-4" onClick={handleViewProfile}>
                  View Farcaster Profile
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
