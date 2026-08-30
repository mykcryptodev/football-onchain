"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ConnectButton, darkTheme, lightTheme } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

import { appDescription, appName, chain, usdc } from "@/constants";
import { cn } from "@/lib/utils";
import { useDisplayToken } from "@/providers/DisplayTokenProvider";
import { client } from "@/providers/Thirdweb";

import { ModeToggle } from "./mode-toggle";

const links = [
  { href: "/contest/create", label: "Create" },
  { href: "/join", label: "Join" },
  { href: "/pickem", label: "Pick'em" },
];

// The connect button is rendered by thirdweb, so it needs the palette handed to
// it explicitly or it floats on top of the app looking like a different product.
const sharedThemeColors = {
  connectedButtonBg: "var(--background)",
  connectedButtonBgHover: "var(--accent)",
  modalBg: "var(--card)",
  borderColor: "var(--border)",
  separatorLine: "var(--border)",
  primaryText: "var(--foreground)",
  secondaryText: "var(--muted-foreground)",
  accentText: "var(--brand)",
  accentButtonBg: "var(--brand)",
  accentButtonText: "var(--brand-foreground)",
  primaryButtonBg: "var(--primary)",
  primaryButtonText: "var(--primary-foreground)",
  secondaryButtonBg: "var(--secondary)",
  secondaryButtonText: "var(--secondary-foreground)",
  secondaryButtonHoverBg: "var(--accent)",
  tertiaryBg: "var(--muted)",
  success: "var(--success)",
  danger: "var(--destructive)",
} as const;

export function Navigation() {
  const { resolvedTheme } = useTheme();
  const { tokenAddress } = useDisplayToken();
  const pathname = usePathname();

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
    <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link className="group flex items-center gap-2" href="/">
            <Image
              alt={appName}
              className="rounded-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6"
              height={32}
              src="/icon.png"
              width={32}
            />
            <span className="text-xl font-bold tracking-tight">{appName}</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  aria-current={active ? "page" : undefined}
                  href={href}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              );
            })}
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
                ? darkTheme({ colors: { ...sharedThemeColors } })
                : lightTheme({ colors: { ...sharedThemeColors } })
            }
          />
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
