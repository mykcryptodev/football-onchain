"use client";

import Link from "next/link";
import { AccountAvatar, AccountProvider, Blobbie } from "thirdweb/react";

import ContestStatsCard from "@/components/pickem/ContestStatsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PickemContestListItem } from "@/hooks/usePickemContests";
import { useUserPickems } from "@/hooks/useUserPickems";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

const SEASON_TYPE_LABELS: Record<number, string> = {
  1: "Preseason",
  2: "Regular Season",
  3: "Postseason",
};

const PAYOUT_TYPE_LABELS: Record<number, string> = {
  0: "Winner Take All",
  1: "Top 3",
  2: "Top 5",
};

interface PickemContestCardProps {
  contest: PickemContestListItem;
}

export function PickemContestCard({ contest }: PickemContestCardProps) {
  const { profile, isLoading: profileLoading } = useUserProfile(
    contest.creator,
  );
  const { contestIds } = useUserPickems();
  const avatarUrl = resolveAvatarUrl(profile?.avatar);
  const isOpen = contest.submissionDeadline > Date.now();
  const hasEntry = contestIds.has(contest.id);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">
              {SEASON_TYPE_LABELS[contest.seasonType]} Week {contest.weekNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {contest.year} Season • {contest.gameIds.length} Games
            </p>
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
          <Badge variant={isOpen ? "default" : "secondary"}>
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ContestStatsCard
          className="mb-4"
          currency={contest.currency}
          entryFee={contest.entryFee}
          payoutType={PAYOUT_TYPE_LABELS[contest.payoutType]}
          showCard={false}
          totalEntries={contest.totalEntries}
          totalPrizePool={contest.totalPrizePool}
        />

        <Link className="block" href={`/pickem/${contest.id}`}>
          <Button className="w-full" size="lg" variant="default">
            {hasEntry
              ? "View Your Picks"
              : isOpen
                ? "Make Your Picks"
                : "View Contest"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
