"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense } from "react";
import { ConnectButton, darkTheme, lightTheme } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

import { appDescription, appName, chain, usdc } from "@/constants";
import { useDisplayToken } from "@/providers/DisplayTokenProvider";
import { client } from "@/providers/Thirdweb";

import { ModeToggle } from "./mode-toggle";

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMyPicks =
    pathname === "/pickem" && searchParams.get("tab") === "my-pickems";
  const links = [
    {
      href: "/pickem",
      label: "Pick’em",
      active: pathname.startsWith("/pickem") && !isMyPicks,
    },
    { href: "/pickem?tab=my-pickems", label: "My picks", active: isMyPicks },
    {
      href: "/join",
      label: "Squares",
      active:
        pathname === "/join" ||
        pathname.startsWith("/contest/") ||
        pathname.startsWith("/contests/"),
    },
  ];
  return (
    <div
      className={
        mobile
          ? "grid grid-cols-3 border-t px-4 md:hidden"
          : "hidden items-center gap-1 md:flex"
      }
    >
      {links.map(link => (
        <Link
          key={link.href}
          aria-current={link.active ? "page" : undefined}
          href={link.href}
          className={
            mobile
              ? "border-b-2 border-transparent py-3 text-center text-sm font-semibold text-muted-foreground hover:bg-secondary aria-[current=page]:border-primary aria-[current=page]:bg-secondary aria-[current=page]:text-primary"
              : "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-primary"
          }
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

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
    <nav className="sticky top-0 z-40 border-b bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
      <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-8 lg:gap-12">
          <Link className="group flex min-w-0 items-center gap-2.5" href="/">
            <Image
              alt={appName}
              className="size-9 shrink-0 transition-transform group-hover:-rotate-3"
              height={36}
              src="/icon.png"
              width={36}
            />
            <span className="truncate text-base font-extrabold tracking-[-0.035em] sm:text-lg">
              {appName}
            </span>
          </Link>

          <Suspense fallback={null}>
            <NavigationLinks />
          </Suspense>
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
      <Suspense fallback={null}>
        <NavigationLinks mobile />
      </Suspense>
    </nav>
  );
}
