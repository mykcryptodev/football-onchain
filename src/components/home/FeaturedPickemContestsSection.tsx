"use client";

import { useMemo } from "react";

import { PickemContestCard } from "@/components/pickem/PickemContestCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { featuredPickemContestIds } from "@/constants";
import { usePickemContests } from "@/hooks/usePickemContests";

function FeaturedSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map(item => (
        <Card key={item}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FeaturedPickemContestsSection() {
  const { contests, isLoading } = usePickemContests();
  const featuredContests = useMemo(() => {
    if (featuredPickemContestIds.length === 0) return [];
    const contestMap = new Map(contests.map(contest => [contest.id, contest]));
    return featuredPickemContestIds
      .map(id => contestMap.get(id))
      .filter((contest): contest is (typeof contests)[number] =>
        Boolean(contest),
      );
  }, [contests]);

  if (featuredPickemContestIds.length === 0) return null;

  const isSingleFeatured = featuredContests.length === 1;
  return (
    <section className="py-12">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Featured Pick&apos;em Contests</h2>
          <p className="text-muted-foreground">
            Top pick&apos;em contests curated for quick access.
          </p>
        </div>
        {isLoading ? (
          <FeaturedSkeleton />
        ) : featuredContests.length > 0 ? (
          <div
            className={`grid gap-4 md:grid-cols-2 ${isSingleFeatured ? "md:grid-cols-1 justify-items-center" : ""}`}
          >
            {featuredContests.map(contest => (
              <div
                key={contest.id}
                className={isSingleFeatured ? "w-full md:max-w-xl" : ""}
              >
                <PickemContestCard contest={contest} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Featured pick&apos;em contests will appear here once available.
          </p>
        )}
      </div>
    </section>
  );
}
