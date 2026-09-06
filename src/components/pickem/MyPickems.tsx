"use client";
import Link from "next/link";
import { useState } from "react";
import { ConnectButton } from "thirdweb/react";

import { PickemEntryCard } from "@/components/pickem/PickemEntryCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { chain } from "@/constants";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import { useMyCurrentWeekPicks } from "@/hooks/useMyCurrentWeekPicks";
import { client } from "@/providers/Thirdweb";

function WinningsTotal({
  currency,
  amount,
}: {
  currency: string;
  amount: bigint;
}) {
  const { formattedValue, isLoading, error } = useFormattedCurrency({
    amount,
    currencyAddress: currency,
  });
  return (
    <p>
      {isLoading
        ? "Loading total…"
        : error
          ? "Total unavailable"
          : formattedValue}
    </p>
  );
}

export default function MyPickems({
  contestId,
  compact = false,
}: {
  contestId?: number;
  compact?: boolean;
}) {
  const [period, setPeriod] = useState<"current" | "all">("current");
  const { entries, isConnected, isLoading, error, refetch } =
    useMyCurrentWeekPicks(contestId ?? period);
  const totals = new Map<string, bigint>();
  for (const entry of entries)
    if (entry.gamesFinalized && entry.prizeWon > 0n) {
      const currency = entry.currency.toLowerCase();
      totals.set(currency, (totals.get(currency) ?? 0n) + entry.prizeWon);
    }
  if (!isConnected)
    return (
      <div className="rounded-xl border p-6 space-y-3">
        <h2 className="text-xl font-semibold">
          Your picks, scores, and standings
        </h2>
        <p>Log in to see your entries.</p>
        <ConnectButton
          chain={chain}
          client={client}
          connectButton={{ label: "Log in to see my picks" }}
        />
      </div>
    );
  return (
    <div className="space-y-5">
      {contestId === undefined && !compact && (
        <div aria-label="Entry period" className="flex gap-2">
          <Button
            aria-pressed={period === "current"}
            variant={period === "current" ? "default" : "outline"}
            onClick={() => setPeriod("current")}
          >
            This week
          </Button>
          <Button
            aria-pressed={period === "all"}
            variant={period === "all" ? "default" : "outline"}
            onClick={() => setPeriod("all")}
          >
            All weeks
          </Button>
        </div>
      )}
      {error ? (
        <div className="rounded-xl border p-5" role="alert">
          <p>We couldn’t load your picks. Your submitted entries are safe.</p>
          <Button variant="outline" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : entries.length ? (
        entries.map(entry => (
          <PickemEntryCard key={entry.tokenId} entry={entry} />
        ))
      ) : (
        <div className="rounded-xl border p-6 space-y-3">
          <p>
            No entries{" "}
            {period === "current" && contestId === undefined
              ? "for this week yet"
              : "yet"}
            .
          </p>
          <Button asChild>
            <Link href="/pickem">Find a contest</Link>
          </Button>
        </div>
      )}
      {period === "all" &&
        contestId === undefined &&
        !isLoading &&
        !error &&
        entries.length > 0 && (
          <details className="rounded-xl border p-5">
            <summary className="cursor-pointer font-semibold">
              Entry history totals
            </summary>
            <div className="mt-3 text-sm space-y-2">
              <p>
                {entries.length} owned entries ·{" "}
                {
                  entries.filter(
                    entry => entry.gamesFinalized && entry.prizeWon > 0n,
                  ).length
                }{" "}
                winning entries
              </p>
              <p className="text-muted-foreground">
                Winnings by currency, including claimed prizes. Final amounts
                follow the confirmed leaderboard.
              </p>
              {[...totals].map(([currency, amount]) => (
                <WinningsTotal
                  key={currency}
                  amount={amount}
                  currency={currency}
                />
              ))}
            </div>
          </details>
        )}
    </div>
  );
}
