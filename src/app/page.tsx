import { Grid3x3, Trophy } from "lucide-react";
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
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center py-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Football Onchain
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Play Superbowl Squares or Pick&apos;em with your friends for any
            NFL game — all onchain.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Grid3x3 className="h-6 w-6" />
                  Superbowl Squares
                </CardTitle>
                <CardDescription>
                  Grab squares on a 10x10 grid and win when the score matches
                  your numbers at the end of any quarter.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-3 flex-col sm:flex-row">
                <Link className="flex-1" href="/contest/create">
                  <Button className="w-full" size="lg">
                    Create Contest
                  </Button>
                </Link>
                <Link className="flex-1" href="/join">
                  <Button className="w-full" size="lg" variant="outline">
                    Join Contest
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="h-6 w-6" />
                  Pick&apos;em
                </CardTitle>
                <CardDescription>
                  Predict the winner of every game in an NFL week and compete
                  for the biggest prize pool.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-3 flex-col sm:flex-row">
                <Link className="flex-1" href="/pickem?tab=create">
                  <Button className="w-full" size="lg">
                    Create Contest
                  </Button>
                </Link>
                <Link className="flex-1" href="/pickem">
                  <Button className="w-full" size="lg" variant="outline">
                    Browse Contests
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <FeaturedContestsSection />

        <FeaturedPickemContestsSection />

        <HomeContestHighlights />

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏈 Easy Setup
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
              <CardTitle className="flex items-center gap-2">
                🎯 Fair & Transparent
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
              <CardTitle className="flex items-center gap-2">
                💰 Instant Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Winners receive their prizes automatically through smart
                contracts. No delays, no disputes.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-bold text-xl">
                  1
                </span>
              </div>
              <h3 className="font-semibold mb-2">Create Contest</h3>
              <p className="text-muted-foreground text-sm">
                Set up your football squares game with custom settings
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-bold text-xl">
                  2
                </span>
              </div>
              <h3 className="font-semibold mb-2">Invite Players</h3>
              <p className="text-muted-foreground text-sm">
                Share your contest code and let participants join
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-bold text-xl">
                  3
                </span>
              </div>
              <h3 className="font-semibold mb-2">Watch & Win</h3>
              <p className="text-muted-foreground text-sm">
                Follow the game and see if your squares hit the winning numbers
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary-foreground font-bold text-xl">
                  4
                </span>
              </div>
              <h3 className="font-semibold mb-2">Get Paid</h3>
              <p className="text-muted-foreground text-sm">
                Automatic payouts to winners via smart contracts
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
