import Link from "next/link";

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
            Superbowl Squares
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Join the ultimate football squares experience. Create contests,
            invite friends, and win big!
          </p>
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <Link href="/contest/create">
              <Button className="text-lg px-8" size="lg">
                Create Contest
              </Button>
            </Link>
            <Link href="/join">
              <Button className="text-lg px-8" size="lg" variant="outline">
                Join Contest
              </Button>
            </Link>
          </div>
        </div>

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
