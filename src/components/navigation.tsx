"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ConnectButton, darkTheme, lightTheme } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

import { appDescription, appName, chain, usdc } from "@/constants";
import { useDisplayToken } from "@/providers/DisplayTokenProvider";
import { client } from "@/providers/Thirdweb";

import { ModeToggle } from "./mode-toggle";

export function Navigation() {
  const pathname = usePathname();
  const links = [
    { href: "/pickem", label: "Pick’em" },
    { href: "/pickem?tab=my-pickems", label: "My picks" },
    { href: "/join", label: "Squares" },
  ];
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
    <nav className="sticky top-0 z-40 border-b bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-8 lg:gap-12">
          <Link className="group flex min-w-0 items-center gap-2.5" href="/">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-card shadow-sm transition-transform group-hover:-rotate-3">
              <Image alt={appName} height={26} src="/icon.png" width={26} />
            </span>
            <span className="truncate text-base font-extrabold tracking-[-0.035em] sm:text-lg">
              {appName}
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(link => (
              <Link
                key={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground"
                href={link.href}
                aria-current={
                  link.href === "/pickem" && pathname.startsWith("/pickem")
                    ? "page"
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              className: "!h-10 !rounded-xl !px-4 !font-semibold",
            }}
            connectModal={{
              title: `Login to ${appName}`,
              showThirdwebBranding: false,
            }}
            detailsButton={{
              className: "!h-10 !border-0 !bg-transparent !p-0 !shadow-none",
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
      <div className="grid grid-cols-3 border-t px-4 md:hidden">
        {links.map(link => (
          <Link
            key={link.href}
            className="py-3 text-center text-sm font-semibold hover:bg-secondary"
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
