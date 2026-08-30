"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
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
    <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2" href="/">
            <Image alt={appName} height={28} src="/icon.png" width={28} />
            <span className="font-semibold text-base tracking-tight">{appName}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              href="/contest/create"
            >
              Create Contest
            </Link>
            <Link
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              href="/join"
            >
              Join Contest
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
