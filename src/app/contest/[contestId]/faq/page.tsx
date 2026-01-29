"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { PayoutStrategyType } from "@/components/contest/types";
import { useContestData } from "@/hooks/useContestData";
import { getPayoutStrategyType } from "@/lib/payout-utils";

export default function ContestFaqPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { contest, gameScore } = useContestData(contestId);
  const isScoreChanges =
    contest?.payoutStrategy &&
    getPayoutStrategyType(contest.payoutStrategy) ===
      PayoutStrategyType.SCORE_CHANGES;
  const homeTeamName = gameScore?.homeTeamName ?? "Home team";
  const awayTeamName = gameScore?.awayTeamName ?? "Away team";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-3">
            <Link
              className="text-sm text-muted-foreground hover:text-foreground"
              href={`/contest/${contestId}`}
            >
              ← Back to contest
            </Link>
            <h1 className="text-3xl font-bold">Super Bowl Squares FAQ</h1>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                TL;DR
              </p>
              <p className="text-lg font-semibold">
                There is no strategy: buy a square at random and have fun!
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">What is it?</h2>
              <p className="text-sm text-muted-foreground">
                A 10x10 grid of squares tied to the Super Bowl score.
              </p>
            </section>
            <section className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">How do I play?</h2>
              <p className="text-sm text-muted-foreground">
                Buy a square. Your square gets two numbers at random.
              </p>
            </section>
            <section className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">How do I win?</h2>
              <p className="text-sm text-muted-foreground">
                {isScoreChanges
                  ? "When the quarter ends or the score of the game changes, match the last digits of each team score to the numbers of your box."
                  : "When the quarter ends, match the last digits of each team score to the numbers of your box."}
              </p>
            </section>
            <section className="rounded-lg border bg-card p-4 space-y-2">
              <h2 className="text-lg font-semibold">Why random?</h2>
              <p className="text-sm text-muted-foreground">
                Every square has the same chance once numbers are set.
              </p>
            </section>
          </div>

          <section className="rounded-lg border bg-card p-4 space-y-2">
            <h2 className="text-lg font-semibold">Quick example</h2>
            <p className="text-sm text-muted-foreground">
              Example score: {homeTeamName} 21, {awayTeamName} 17. The last
              digits are 1 and 7. The {homeTeamName}-1 / {awayTeamName}-7 box
              wins that quarter.
            </p>
          </section>

          <div className="text-sm">
            <Link
              className="text-muted-foreground hover:text-foreground underline underline-offset-4"
              href="https://x.com/mykcryptodev/status/2012635832713175139"
              rel="noreferrer"
              target="_blank"
            >
              Technical deep dive for nerds
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
