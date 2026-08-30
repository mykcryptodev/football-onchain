import {
  ArrowUpRight,
  Banknote,
  Blocks,
  Grid3x3,
  Timer,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { FeaturedContestsSection } from "@/components/home/FeaturedContestsSection";
import { FeaturedPickemContestsSection } from "@/components/home/FeaturedPickemContestsSection";
import { HeroGrid } from "@/components/home/HeroGrid";
import { HomeContestHighlights } from "@/components/home/HomeContestHighlights";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Timer,
    title: "Set up in a minute",
    body: "Pick a game, set the entry fee, share the link. No spreadsheet, no chasing people for cash.",
  },
  {
    icon: Blocks,
    title: "Numbers you can audit",
    body: "Square numbers are drawn onchain and the draw is public. Nobody can move a square after kickoff.",
  },
  {
    icon: Banknote,
    title: "Payouts settle themselves",
    body: "The contract pays winners at the end of each quarter. No treasurer, no venmo requests, no disputes.",
  },
];

const steps = [
  {
    n: "01",
    title: "Open a contest",
    body: "Choose the game and the entry fee.",
  },
  {
    n: "02",
    title: "Fill the board",
    body: "Share the link and let players claim squares.",
  },
  {
    n: "03",
    title: "Numbers drop",
    body: "Rows and columns are drawn onchain at kickoff.",
  },
  {
    n: "04",
    title: "Winners get paid",
    body: "Each quarter settles to the matching square.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-6xl px-4">
        {/* Hero */}
        <section className="relative py-16 md:py-24">
          <div
            aria-hidden
            className="gridiron pointer-events-none absolute inset-x-0 -top-16 h-[28rem]"
          />
          <div className="relative grid items-center gap-12 md:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="label-eyebrow text-brand">
                Squares &amp; Pick&apos;em &middot; Onchain
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] md:text-6xl">
                Football pools,{" "}
                <span className="text-brand">settled onchain</span>.
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg text-muted-foreground md:text-xl">
                Run Superbowl Squares or a Pick&apos;em league for any NFL game.
                The board is public, the draw is verifiable, and the contract
                pays the winners itself.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="brand">
                  <Link href="/contest/create">
                    Start a contest
                    <ArrowUpRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/join">Join with a code</Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm md:max-w-none">
              <HeroGrid />
            </div>
          </div>
        </section>

        {/* The two ways to play */}
        <section className="grid gap-6 pb-16 md:grid-cols-2">
          <Card className="group order-2 flex flex-col hover:-translate-y-0.5 hover:shadow-md md:order-1">
            <CardHeader>
              <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-muted text-brand-foreground">
                <Grid3x3 className="size-5" />
              </span>
              <CardTitle className="text-2xl">Superbowl Squares</CardTitle>
              <CardDescription>
                Claim squares on a 10x10 board. When the score at the end of a
                quarter matches your two digits, the pot is yours.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row">
              <Button asChild className="h-14 flex-1" size="lg">
                <Link href="/contest/create">Create contest</Link>
              </Button>
              <Button
                asChild
                className="h-14 flex-1"
                size="lg"
                variant="outline"
              >
                <Link href="/join">Join contest</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group order-1 flex flex-col hover:-translate-y-0.5 hover:shadow-md md:order-2">
            <CardHeader>
              <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-muted text-brand-foreground">
                <Trophy className="size-5" />
              </span>
              <CardTitle className="text-2xl">Pick&apos;em</CardTitle>
              <CardDescription>
                Call every game on the slate for an NFL week. Most correct picks
                takes the prize pool.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row">
              <Button asChild className="h-14 flex-1" size="lg">
                <Link href="/pickem?tab=create">Create contest</Link>
              </Button>
              <Button
                asChild
                className="h-14 flex-1"
                size="lg"
                variant="outline"
              >
                <Link href="/pickem">Browse contests</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <FeaturedContestsSection />

        <FeaturedPickemContestsSection />

        <HomeContestHighlights />

        {/* Why it holds up — one panel, hairline dividers, no card chrome. */}
        <section className="py-16">
          <div className="grid divide-y divide-border overflow-hidden rounded-2xl border md:grid-cols-3 md:divide-x md:divide-y-0">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-8">
                <Icon className="size-5 text-brand" strokeWidth={1.75} />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — chalk markers on a yard line. */}
        <section className="pb-20">
          <h2 className="text-3xl font-bold">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map(({ n, title, body }) => (
              <li key={n} className="relative md:pt-8">
                <span
                  aria-hidden
                  className="absolute left-0 top-3 hidden h-px w-full bg-border md:block"
                />
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 hidden size-3 rounded-full border-2 border-brand bg-background md:block"
                />
                <span data-numeric className="label-eyebrow text-brand">
                  {n}
                </span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-[34ch] text-sm text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
