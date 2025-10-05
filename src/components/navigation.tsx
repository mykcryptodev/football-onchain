"use client";

import { appDescription, appName, chain, usdc } from "@/constants";
import { client } from "@/providers/Thirdweb";
import { useTheme } from "next-themes";
import Link from "next/link";
import { base, baseSepolia } from "thirdweb/chains";
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { ModeToggle } from "./mode-toggle";

export function Navigation() {
  const { theme } = useTheme();

  const wallets = [
    inAppWallet({
      auth: {
        options: ["x", "telegram", "coinbase", "google", "email", "phone"],
      },
    }),
    createWallet("com.coinbase.wallet"),
    createWallet("io.metamask"),
    createWallet("me.rainbow"),
    createWallet("app.phantom"),
  ];

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
              href="/contest/create"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Create Contest
            </Link>
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
            <Link
              href="/pickem"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pick&apos;em
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4 gap-2">
          <ConnectButton
            client={client}
            chain={chain}
            theme={theme === "dark" ? "dark" : "light"}
            connectButton={{
              label: "Login",
              className: "!size-9",
            }}
            wallets={wallets}
            appMetadata={{
              name: appName,
              description: appDescription,
            }}
            connectModal={{
              title: `Login to ${appName}`,
              showThirdwebBranding: false,
            }}
            detailsButton={{
              className: "!size-9 !border-none",
              displayBalanceToken: {
                [baseSepolia.id]: usdc[baseSepolia.id],
                [base.id]: usdc[base.id],
              },
            }}
          />
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
