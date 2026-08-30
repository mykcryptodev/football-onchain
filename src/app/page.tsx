import { Grid3x3, Shield, Trophy, Zap } from "lucide-react";
import Link from "next/link";

import { FeaturedContestsSection } from "@/components/home/FeaturedContestsSection";
import { FeaturedPickemContestsSection } from "@/components/home/FeaturedPickemContestsSection";
import { HomeContestHighlights } from "@/components/home/HomeContestHighlights";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <div className="py-16 md:py-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-4 max-w-2xl">
            Football contests, onchain.
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl">
            Play Squares or Pick&apos;em with friends for any NFL game. Fair
            payouts powered by smart contracts.
          </p>

          {/* Game cards */}
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Grid3x3 className="h-5 w-5 text-primary" />
                  Squares
                </CardTitle>
                <CardDescription>
                  Grab squares on a 10x10 grid and win when the score matches
                  your numbers at the end of any quarter.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2 flex-col sm:flex-row">
                <Link className="flex-1" href="/contest/create">
                  <Button className="w-full" size="lg">
                    Create
                  </Button>
                </Link>
                <Link className="flex-1" href="/join">
                  <Button className="w-full" size="lg" variant="outline">
                    Join
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="h-5 w-5 text-primary" />
                  Pick&apos;em
                </CardTitle>
                <CardDescription>
                  Predict the winner of every game in an NFL week and compete
                  for the biggest prize pool.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2 flex-col sm:flex-row">
                <Link className="flex-1" href="/pickem?tab=create">
                  <Button className="w-full" size="lg">
                    Create
                  </Button>
                </Link>
                <Link className="flex-1" href="/pickem">
                  <Button className="w-full" size="lg" variant="outline">
                    Browse
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <FeaturedContestsSection />

        <FeaturedPickemContestsSection />

        <HomeContestHighlights />

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Grid3x3 className="h-4 w-4 text-primary" />
                Easy Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create football squares contests in seconds. Set your game,
                entry fee, and invite participants.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Fair and Transparent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powered by blockchain technology for provably fair number
                generation and transparent payouts.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Instant Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Winners receive prizes automatically through smart contracts. No
                delays, no disputes.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="py-12 border-t border-border">
          <h2 className="text-2xl font-semibold tracking-tight mb-10">How it works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "1", title: "Create Contest", body: "Set up your squares game with custom settings" },
              { n: "2", title: "Invite Players", body: "Share your contest code and let participants join" },
              { n: "3", title: "Watch and Win", body: "Follow the game and see if your squares hit" },
              { n: "4", title: "Get Paid", body: "Automatic payouts to winners via smart contracts" },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-semibold font-mono tabular-nums">
                    {n}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
