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
    <section className="py-14 md:py-20">
      <div className="rounded-[2rem] border bg-card/55 p-5 shadow-[0_24px_70px_-55px_rgba(15,45,28,.7)] md:p-9">
        <div className="mb-8 max-w-xl">
          <h2 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
            Featured Pick&apos;em
          </h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            Weekly pools ready for your picks.
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
