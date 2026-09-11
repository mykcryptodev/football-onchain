"use client";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";

import { PickerAvatar, shortAddress } from "@/components/pickem/PickerAvatars";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoxesContests } from "@/hooks/useBoxesContests";
import { useFormattedCurrency } from "@/hooks/useFormattedCurrency";
import {
  type CurrentWeekPickemEntry,
  useMyCurrentWeekPicks,
} from "@/hooks/useMyCurrentWeekPicks";
import { useOwnedBoxes } from "@/hooks/useOwnedBoxes";
import { useUserProfile } from "@/hooks/useUserProfile";
import { SEASON_TYPE_LABELS } from "@/lib/pickem-scoring";
import { cn } from "@/lib/utils";

function Amount({
  amount,
  currency,
  signed = false,
}: {
  amount: bigint;
  currency: string;
  signed?: boolean;
}) {
  const negative = amount < 0n;
  const { formattedValue, isLoading } = useFormattedCurrency({
    amount: negative ? -amount : amount,
    currencyAddress: currency,
  });
  // Rendered inside <p>, so the placeholder must be inline, not a <div>.
  if (isLoading)
    return (
      <span className="inline-block h-4 w-16 animate-pulse rounded-md bg-muted" />
    );
  return (
    <span
      className={cn(
        "tabular-nums",
        signed && amount > 0n && "text-green-600 dark:text-green-400",
        signed && negative && "text-red-600 dark:text-red-400",
      )}
    >
      {signed && amount > 0n ? "+" : negative ? "−" : ""}
      {formattedValue}
    </span>
  );
}

/**
 * Pick'em P&L per currency, settled contests only: prizes won minus entry
 * fees. Entries in contests that haven't finalized are counted separately.
 */
function PickemPnl({ entries }: { entries: CurrentWeekPickemEntry[] }) {
  const byCurrency = new Map<
    string,
    { spent: bigint; won: bigint; settled: number; open: number }
  >();
  for (const entry of entries) {
    const currency = entry.currency.toLowerCase();
    const row = byCurrency.get(currency) ?? {
      spent: 0n,
      won: 0n,
      settled: 0,
      open: 0,
    };
    if (entry.gamesFinalized) {
      row.spent += entry.entryFee;
      row.won += entry.prizeWon;
      row.settled += 1;
    } else {
      row.open += 1;
    }
    byCurrency.set(currency, row);
  }

  return (
    <div className="space-y-3">
      {[...byCurrency.entries()].map(([currency, row]) => (
        <div
          key={currency}
          className="grid grid-cols-3 gap-2 rounded-2xl border p-4 text-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className="text-lg font-semibold">
              <Amount signed amount={row.won - row.spent} currency={currency} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Won</p>
            <Amount amount={row.won} currency={currency} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entry fees</p>
            <Amount amount={row.spent} currency={currency} />
          </div>
          <p className="col-span-3 text-xs text-muted-foreground">
            {row.settled} settled {row.settled === 1 ? "entry" : "entries"}
            {row.open > 0 ? ` · ${row.open} still in play` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function PickemEntryRow({ entry }: { entry: CurrentWeekPickemEntry }) {
  return (
    <li>
      <Link
        className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-primary/40"
        href={`/pickem/${entry.contestId}/entries/${entry.tokenId}`}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">
            {entry.year} {SEASON_TYPE_LABELS[entry.seasonType] ?? "Season"} ·
            Week {entry.weekNumber}
          </p>
          <p className="text-xs text-muted-foreground">
            Contest #{entry.contestId} · Entry #{entry.tokenId} ·{" "}
            {entry.placeLabel}
          </p>
        </div>
        <div className="shrink-0 text-right text-sm">
          <p className="tabular-nums">
            {entry.correctPicks}/{entry.scoredGames || entry.totalGames}
          </p>
          {entry.prizeWon > 0n ? (
            <p className="text-xs">
              <Amount
                signed
                amount={entry.prizeWon}
                currency={entry.currency}
              />
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function SquaresSection({ address }: { address: string }) {
  const owned = useOwnedBoxes(address);
  const { contests } = useBoxesContests();
  const titles = new Map(contests.map(c => [c.id, c.title]));

  if (owned.isLoading) return <Skeleton className="h-16 w-full" />;
  if (owned.error)
    return (
      <p className="text-sm text-muted-foreground">Couldn’t load boxes.</p>
    );
  if (!owned.data?.length)
    return <p className="text-sm text-muted-foreground">No boxes held.</p>;

  return (
    <ul className="space-y-2">
      {owned.data.map(({ contestId, boxTokenIds }) => (
        <li key={contestId}>
          <Link
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-primary/40"
            href={`/contest/${contestId}`}
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {titles.get(contestId) || `Squares contest #${contestId}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Contest #{contestId}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums">
              {boxTokenIds.length} {boxTokenIds.length === 1 ? "box" : "boxes"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PlayerProfile({ address }: { address: string }) {
  const account = useActiveAccount();
  const isYou = account?.address.toLowerCase() === address;
  const { profile } = useUserProfile(address);
  const name = profile?.name?.trim();
  const { entries, isLoading, error } = useMyCurrentWeekPicks("all", address);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <header className="flex items-center gap-4">
        <PickerAvatar address={address} className="size-16" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">
            {name || shortAddress(address)}
            {isYou ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                You
              </span>
            ) : null}
          </h1>
          <a
            className="block truncate text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={`https://basescan.org/address/${address}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {name ? shortAddress(address) : "View on Basescan"}
          </a>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pick’em P&amp;L</h2>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Couldn’t load pick’em entries.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pick’em entries.</p>
        ) : (
          <PickemPnl entries={entries} />
        )}
      </section>

      {entries.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pick’em entries</h2>
          <ul className="space-y-2">
            {entries.map(entry => (
              <PickemEntryRow key={entry.tokenId} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Squares</h2>
        <SquaresSection address={address} />
      </section>

      <p className="text-xs text-muted-foreground">
        Shows the entries and boxes this wallet holds right now; ones it sold or
        transferred aren’t listed. Squares winnings aren’t in the P&amp;L yet.
      </p>
    </main>
  );
}
