"use client";

/* eslint-disable simple-import-sort/imports */
import { useTheme } from "next-themes";
import Link from "next/link";
/* eslint-enable simple-import-sort/imports */
import { ConnectButton, darkTheme, lightTheme } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

import { appDescription, appName, chain, usdc } from "@/constants";
import { useDisplayToken } from "@/providers/DisplayTokenProvider";
import { client } from "@/providers/Thirdweb";

import { ModeToggle } from "./mode-toggle";

export function Navigation() {
  const { resolvedTheme } = useTheme();
  const { tokenAddress } = useDisplayToken();

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
          <Link className="flex items-center space-x-2" href="/">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                FB
              </span>
            </div>
            <span className="font-bold text-xl">{appName}</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              href="/contest/create"
            >
              Create Contest
            </Link>
            <Link
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              href="/join"
            >
              Join Contest
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4 gap-2">
          <ConnectButton
            chain={chain}
            client={client}
            wallets={wallets}
            appMetadata={{
              name: appName,
              description: appDescription,
            }}
            connectButton={{
              label: "Login",
              className: "!size-9",
            }}
            connectModal={{
              title: `Login to ${appName}`,
              showThirdwebBranding: false,
            }}
            detailsButton={{
              className: "!border-none",
              displayBalanceToken: {
                [chain.id]: tokenAddress || usdc[chain.id],
              },
            }}
            theme={
              resolvedTheme === "dark"
                ? darkTheme({
                    colors: { connectedButtonBg: "var(--background)" },
                  })
                : lightTheme({
                    colors: { connectedButtonBg: "var(--background)" },
                  })
            }
          />
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
