"use client";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";

import { FeaturedPickemHero } from "@/components/home/FeaturedPickemHero";
import MyPickems from "@/components/pickem/MyPickems";
import { PickemContestCard } from "@/components/pickem/PickemContestCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentNFLWeek } from "@/hooks/useCurrentNFLWeek";
import { useNow } from "@/hooks/useNow";
import { useOwnedPickemEntries } from "@/hooks/useOwnedPickemEntries";
import {
  type PickemContestListItem,
  usePickemContests,
} from "@/hooks/usePickemContests";
import { usePickemDraft } from "@/hooks/usePickemDraft";
import { hasDraftPicks } from "@/lib/pickem-draft";

function ResumeDraft({ contest }: { contest: PickemContestListItem }) {
  const { draft } = usePickemDraft(contest.id, contest.gameIds);
  const now = useNow();
  if (
    !hasDraftPicks(draft) ||
    (!draft?.pending && contest.submissionDeadline <= now)
  )
    return null;
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-semibold">
          Week {contest.weekNumber} ·{" "}
          {draft?.pending ? "Entry confirmation pending" : "Finish your picks"}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft?.pending
            ? "Check your transaction before making another entry."
            : "Your draft is saved on this device. It hasn’t been entered yet."}
        </p>
      </div>
      <Button asChild>
        <Link href={`/pickem/${contest.id}`}>
          {draft?.pending ? "Check entry status" : "Continue picks"}
        </Link>
      </Button>
    </div>
  );
}
export function PickemHome() {
  const account = useActiveAccount();
  const owned = useOwnedPickemEntries();
  const { contests, isLoading, error, refetch } = usePickemContests();
  const { currentWeek } = useCurrentNFLWeek();
  const now = useNow();
  const open = contests
    .filter(
      c =>
        now > 0 &&
        c.submissionDeadline > now &&
        !c.gamesFinalized &&
        !c.payoutComplete,
    )
    .sort((a, b) => {
      const isCurrent = (c: PickemContestListItem) =>
        Boolean(
          currentWeek &&
          c.year === currentWeek.seasonYear &&
          c.seasonType === currentWeek.seasonType &&
          c.weekNumber === currentWeek.week,
        );
      return (
        Number(isCurrent(b)) - Number(isCurrent(a)) ||
        a.submissionDeadline - b.submissionDeadline
      );
    });
  const hasEntries = Boolean(account && owned.data?.length);
  return (
    <main>
      <section className="hero-field border-b">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                  NFL Pick’em
                </p>
                <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">
                  {hasEntries
                    ? "Your game day."
                    : "Pick the winners. Follow every game."}
                </h1>
                <p className="mt-3 text-muted-foreground">
                  {hasEntries
                    ? "Your teams, your results, your place in the pool."
                    : "Choose a weekly pool, pick each winner, and compete with friends."}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/pickem">Find a contest</Link>
              </Button>
            </div>
            <FeaturedPickemHero contestId={open[0]?.id} />
          </div>
          {contests.map(contest => (
            <ResumeDraft key={contest.id} contest={contest} />
          ))}
          {account && owned.isError && (
            <div className="rounded-xl border p-4" role="alert">
              We couldn’t check your entries.{" "}
              <Button variant="outline" onClick={() => owned.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {account && owned.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : hasEntries ? (
            <MyPickems />
          ) : null}
          {!hasEntries &&
            (isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : error ? (
              <div role="alert">
                Contests couldn’t load.{" "}
                <Button variant="outline" onClick={refetch}>
                  Try again
                </Button>
              </div>
            ) : open[0] ? (
              <div className="max-w-xl">
                <h2 className="mb-3 text-xl font-semibold">
                  Featured open pool
                </h2>
                <PickemContestCard contest={open[0]} />
              </div>
            ) : (
              <p className="rounded-xl border p-6">
                No pools are open right now.{" "}
                <Link className="underline" href="/pickem?tab=my-pickems">
                  View your past picks
                </Link>
              </p>
            ))}
        </div>
      </section>
      {hasEntries && open[0] && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Open to enter</h2>
          <div className="max-w-xl">
            <PickemContestCard contest={open[0]} />
          </div>
        </section>
      )}
      <section className="mx-auto max-w-6xl px-4 py-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border p-6">
          <h2 className="text-xl font-bold">Bring your group</h2>
          <p className="my-3 text-muted-foreground">
            Create a weekly Pick’em pool and share the link with friends.
          </p>
          <Button asChild variant="outline">
            <Link href="/pickem?tab=create">Create a contest</Link>
          </Button>
        </div>
        <div className="rounded-2xl border p-6">
          <h2 className="text-xl font-bold">Looking for Squares?</h2>
          <p className="my-3 text-muted-foreground">
            Find a Squares pool for your next game.
          </p>
          <Button asChild variant="ghost">
            <Link href="/join">Browse Squares</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
