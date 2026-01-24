"use client";

import { useMemo } from "react";

import { ContestCard } from "@/components/contest/ContestCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { featuredContestIds } from "@/constants";
import { useBoxesContests } from "@/hooks/useBoxesContests";

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

export function FeaturedContestsSection() {
  const { contests, isLoading } = useBoxesContests();

  const featuredContests = useMemo(() => {
    if (featuredContestIds.length === 0) {
      return [];
    }

    const contestMap = new Map(contests.map(contest => [contest.id, contest]));
    return featuredContestIds
      .map(id => contestMap.get(id))
      .filter((contest): contest is (typeof contests)[number] =>
        Boolean(contest),
      );
  }, [contests]);

  if (featuredContestIds.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Featured Contests</h2>
          <p className="text-muted-foreground">
            Top contests curated for quick access.
          </p>
        </div>
        {isLoading ? (
          <FeaturedSkeleton />
        ) : featuredContests.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {featuredContests.map(contest => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Featured contests will appear here once available.
          </p>
        )}
      </div>
    </section>
  );
}
