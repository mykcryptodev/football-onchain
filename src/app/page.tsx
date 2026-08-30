import {
  ArrowRight,
  Blocks,
  Check,
  Grid3x3,
  LockKeyhole,
  Trophy,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { FeaturedContestsSection } from "@/components/home/FeaturedContestsSection";
import { FeaturedPickemContestsSection } from "@/components/home/FeaturedPickemContestsSection";
import { FeaturedPickemHero } from "@/components/home/FeaturedPickemHero";
import { HomeContestHighlights } from "@/components/home/HomeContestHighlights";
import { HomePickemHighlights } from "@/components/home/HomePickemHighlights";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Start the pool",
    description:
      "Choose a game or NFL week, set the entry, and share the link.",
  },
  {
    title: "Make your play",
    description: "Claim squares or submit your weekly picks before kickoff.",
  },
  {
    title: "Let the contract settle",
    description:
      "Scores resolve the contest and winners receive the pool onchain.",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="hero-field relative border-b">
        <div className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-[1400px] items-center gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:py-16">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Football pools, settled on Base
            </p>
            <h1 className="max-w-[13ch] text-5xl font-black leading-[0.93] tracking-[-0.055em] sm:text-6xl lg:text-7xl xl:text-[5.75rem]">
              Game day lives onchain.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Run Squares and Pick&apos;em with friends. Transparent entries,
              verifiable results, and payouts without the group-chat math.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/pickem">
                  Play Pick&apos;em <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/join">Find a Squares pool</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> No house
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Onchain payouts
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-primary" /> Built for groups
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <FeaturedPickemHero contestId={3} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <FeaturedPickemContestsSection />
        <HomePickemHighlights />
      </div>

      <section className="border-b bg-card/35">
        <div className="mx-auto grid max-w-[1400px] md:grid-cols-2">
          <article className="group border-b p-6 transition-colors hover:bg-card md:border-r md:border-b-0 md:p-10 lg:p-14">
            <div className="flex items-start justify-between gap-6">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Trophy className="size-5" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                NFL week
              </span>
            </div>
            <h2 className="mt-10 text-3xl font-bold tracking-[-0.035em]">
              Pick&apos;em
            </h2>
            <p className="mt-3 max-w-md leading-7 text-muted-foreground">
              Pick each winner, track the leaderboard live, and settle the pot
              after the final whistle.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/pickem?tab=create">Create Pick&apos;em</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/pickem">
                  Browse pools <ArrowRight />
                </Link>
              </Button>
            </div>
          </article>

          <article className="group p-6 transition-colors hover:bg-card md:p-10 lg:p-14">
            <div className="flex items-start justify-between gap-6">
              <div className="grid size-12 place-items-center rounded-2xl border bg-background">
                <Grid3x3 className="size-5" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Any game
              </span>
            </div>
            <h2 className="mt-10 text-3xl font-bold tracking-[-0.035em]">
              Squares
            </h2>
            <p className="mt-3 max-w-md leading-7 text-muted-foreground">
              Claim your spots on a 10x10 board. Score digits decide each
              winner, exactly as the pool intended.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/contest/create">Create Squares</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/join">
                  Join a pool <ArrowRight />
                </Link>
              </Button>
            </div>
          </article>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <FeaturedContestsSection />
        <HomeContestHighlights />
      </div>

      <section className="border-y bg-foreground text-background">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-20 md:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-28">
          <div>
            <Blocks className="size-9 text-primary dark:text-[#c8ef48]" />
            <h2 className="mt-6 max-w-[10ch] text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
              The pool runs itself.
            </h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-[1.75rem] bg-background/15 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="bg-foreground p-6 sm:p-7">
                <span className="font-mono text-xs text-background/50">
                  0{index + 1}
                </span>
                <h3 className="mt-10 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-background/65">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-10 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-28">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Trust the rules, not the host
          </p>
          <h2 className="mt-5 max-w-[13ch] text-4xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
            Football pools without the awkward part.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border bg-card p-6">
            <LockKeyhole className="size-6 text-primary" />
            <h3 className="mt-8 font-semibold">Rules stay fixed</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Entries and contest settings live onchain for everyone to verify.
            </p>
          </div>
          <div className="rounded-[1.5rem] border bg-card p-6 sm:translate-y-8">
            <WalletCards className="size-6 text-primary" />
            <h3 className="mt-8 font-semibold">Payouts stay direct</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Winnings move to the winner&apos;s wallet without manual
              accounting.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
