"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { getContract } from "thirdweb";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import {
  AccountAvatar,
  AccountProvider,
  Blobbie,
  useActiveAccount,
} from "thirdweb/react";

import type { ContestListItem } from "@/app/api/contests/route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { boxes, chain } from "@/constants";
import { useBoxesContests } from "@/hooks/useBoxesContests";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useUserProfile } from "@/hooks/useUserProfile";
import { resolveAvatarUrl } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

function ContestCard({ contest }: { contest: ContestListItem }) {
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
            {/* Creator Info */}
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
          {/* Stats Grid */}
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

          {/* Progress Bar */}
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{
                width: `${(contest.boxesClaimed / totalBoxes) * 100}%`,
              }}
            />
          </div>

          {/* Action Button */}
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Contests Available</h3>
      <p className="text-muted-foreground">{message}</p>
      <Link href="/contest/create">
        <Button className="mt-4" variant="outline">
          Create a Contest
        </Button>
      </Link>
    </div>
  );
}

function JoinContestContent() {
  const account = useActiveAccount();
  const { contests, isLoading, error } = useBoxesContests();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "open" ||
    tabParam === "full" ||
    tabParam === "closed" ||
    tabParam === "all" ||
    tabParam === "yours"
      ? tabParam
      : "open";

  const boxesAddress = boxes[chain.id];
  const { data: ownedContestIds = [], isLoading: isLoadingOwnedContests } =
    useQuery({
      queryKey: ["owned-contests", account?.address],
      enabled: Boolean(account?.address && boxesAddress),
      queryFn: async () => {
        if (!account?.address || !boxesAddress) {
          return [];
        }

        const boxesContract = getContract({
          client,
          chain,
          address: boxesAddress,
        });

        const ownedNFTs = await getOwnedNFTs({
          contract: boxesContract,
          owner: account.address,
        });

        const ownedContestIdsSet = new Set<number>();

        ownedNFTs.forEach(nft => {
          const tokenId = Number(nft.id);
          if (!Number.isNaN(tokenId)) {
            ownedContestIdsSet.add(Math.floor(tokenId / 100));
          }
        });

        return Array.from(ownedContestIdsSet);
      },
      staleTime: 2 * 60 * 1000,
    });

  const openContests = useMemo(
    () => contests.filter(c => c.boxesCanBeClaimed && c.boxesClaimed < 100),
    [contests],
  );
  const fullContests = useMemo(
    () => contests.filter(c => c.boxesClaimed >= 100),
    [contests],
  );
  const closedContests = useMemo(
    () => contests.filter(c => !c.boxesCanBeClaimed && c.boxesClaimed < 100),
    [contests],
  );
  const ownedContestIdSet = useMemo(
    () => new Set(ownedContestIds),
    [ownedContestIds],
  );
  const yoursContests = useMemo(
    () => contests.filter(contest => ownedContestIdSet.has(contest.id)),
    [contests, ownedContestIdSet],
  );

  const yoursCount = account?.address
    ? isLoadingOwnedContests
      ? "..."
      : yoursContests.length
    : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-500">
              Error Loading Contests
            </h1>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Join a Contest</h1>
          <p className="text-xl text-muted-foreground">
            Browse and join available football squares contests
          </p>
        </div>

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Contests List */}
        {!isLoading && contests.length === 0 && (
          <EmptyState message="No contests have been created yet. Be the first!" />
        )}

        {!isLoading && contests.length > 0 && (
          <Tabs
            className="space-y-6"
            value={activeTab}
            onValueChange={value => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set("tab", value);
              router.replace(`${pathname}?${nextParams.toString()}`);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All ({contests.length})</TabsTrigger>
              <TabsTrigger value="open">
                Open ({openContests.length})
              </TabsTrigger>
              <TabsTrigger value="yours">Yours ({yoursCount})</TabsTrigger>
              <TabsTrigger value="full">
                Full ({fullContests.length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({closedContests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4" value="all">
              {contests.map(contest => (
                <ContestCard key={contest.id} contest={contest} />
              ))}
            </TabsContent>

            <TabsContent className="space-y-4" value="open">
              {openContests.length === 0 ? (
                <EmptyState message="No open contests available right now." />
              ) : (
                openContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="yours">
              {!account?.address ? (
                <EmptyState message="Connect your wallet to see contests you've joined." />
              ) : isLoadingOwnedContests ? (
                <LoadingSkeleton />
              ) : yoursContests.length === 0 ? (
                <EmptyState message="You haven't claimed any boxes yet." />
              ) : (
                yoursContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="full">
              {fullContests.length === 0 ? (
                <EmptyState message="No full contests yet." />
              ) : (
                fullContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>

            <TabsContent className="space-y-4" value="closed">
              {closedContests.length === 0 ? (
                <EmptyState message="No closed contests." />
              ) : (
                closedContests.map(contest => (
                  <ContestCard key={contest.id} contest={contest} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default function JoinContestPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JoinContestContent />
    </Suspense>
  );
}
