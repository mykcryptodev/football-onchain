"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import {
  AccountAvatar,
  AccountProvider,
  Blobbie,
} from "thirdweb/react";

import type { ContestListItem } from "@/app/api/contests/route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

interface ContestCardProps {
  contest: ContestListItem;
}

export function ContestCard({ contest }: ContestCardProps) {
  const { formattedValue: boxCostFormatted } = useFormattedCurrency({
    amount: BigInt(contest.boxCost.amount),
    currencyAddress: contest.boxCost.currency,
  });

  const { profile, isLoading: profileLoading } = useUserProfile(
    contest.creator,
  );
  const avatarUrl = resolveAvatarUrl(profile?.avatar);

  const totalBoxes = 100;
  const spotsRemaining = totalBoxes - contest.boxesClaimed;
  const isFull = spotsRemaining === 0;
  const isOpen = contest.boxesCanBeClaimed && !isFull;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{contest.title}</CardTitle>
            {contest.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {contest.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {avatarUrl ? (
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    alt={profile?.name || "User avatar"}
                    src={avatarUrl}
                  />
                  <AvatarFallback className="bg-transparent p-0">
                    <Blobbie
                      address={contest.creator}
                      className="size-5 rounded-full"
                    />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <AccountProvider address={contest.creator} client={client}>
                  <AccountAvatar
                    fallbackComponent={
                      <Blobbie
                        address={contest.creator}
                        className="size-5 rounded-full"
                      />
                    }
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "100%",
                    }}
                  />
                </AccountProvider>
              )}
              <span className="text-xs text-muted-foreground">
                {profileLoading
                  ? "Loading..."
                  : profile?.name ||
                    `${contest.creator.slice(0, 6)}…${contest.creator.slice(-4)}`}
              </span>
            </div>
          </div>
          <Badge
            variant={isOpen ? "default" : isFull ? "secondary" : "outline"}
          >
            {isOpen ? "Open" : isFull ? "Full" : "Closed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Box Cost</p>
              <p className="text-lg font-semibold">{boxCostFormatted}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Spots Filled</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {contest.boxesClaimed}/{totalBoxes}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{
                width: `${(contest.boxesClaimed / totalBoxes) * 100}%`,
              }}
            />
          </div>

          <Link className="block" href={`/contest/${contest.id}`}>
            <Button className="w-full" size="lg" variant="default">
              {isOpen ? "Join Contest" : "View Contest"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
