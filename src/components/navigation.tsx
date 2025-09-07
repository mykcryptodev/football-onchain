"use client";

import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                FB
              </span>
            </div>
            <span className="font-bold text-xl">Football Boxes</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/games"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Games
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/how-to-play"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How to Play
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
