"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { PayoutStrategyType } from "@/components/contest/types";
import { useContestData } from "@/hooks/useContestData";
import { getPayoutStrategyType } from "@/lib/payout-utils";

export default function ContestFaqPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  const { contest } = useContestData(contestId);
  const isScoreChanges =
    contest?.payoutStrategy &&
    getPayoutStrategyType(contest.payoutStrategy) ===
      PayoutStrategyType.SCORE_CHANGES;

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
              If the Chiefs lead the 49ers 21-17, the last digits are 1 and 7.
              The square with 1 and 7 wins that quarter.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
