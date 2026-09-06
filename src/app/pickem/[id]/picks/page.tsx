import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";
import { getSeasonTypeName, getWalletPickemEntries } from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  const wallet = firstValue(resolvedSearchParams.wallet);
  const tokenId = firstValue(resolvedSearchParams.tokenId);

  if (!Number.isSafeInteger(contestId) || !wallet) {
    return { title: "Pick'em Picks" };
  }

  const baseUrl = getBaseUrl();
  const ogParams = new URLSearchParams({ wallet });
  if (tokenId) ogParams.set("tokenId", tokenId);
  const ogImageUrl = `${baseUrl}/api/og/pickem/${contestId}/picks?${ogParams.toString()}`;
  const pageUrl = `${baseUrl}/pickem/${contestId}/picks?${ogParams.toString()}`;

  let title = `Pick'em Contest #${contestId} — My Picks`;
  let description = "Onchain NFL Pick'em picks — see how they're doing.";

  try {
    const result = await getWalletPickemEntries(contestId, wallet);
    if (result?.entered) {
      const entry = result.entries[0];
      const week = `${getSeasonTypeName(result.contest.seasonType)} Week ${result.contest.weekNumber} ${result.contest.year}`;
      title = `${week} Pick'em — My Picks`;
      description =
        entry.gamesDecided > 0
          ? `${entry.correctPicks}/${entry.gamesDecided} correct so far${entry.rankLabel ? `, sitting in ${entry.rankLabel} place` : ""}. Onchain scoring, instant payouts.`
          : "Picks locked in. Onchain scoring, instant payouts.";
    }
  } catch (error) {
    console.error("Error generating picks metadata:", error);
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, ...PICKEM_OG_SIZES.og, alt: title }],
      type: "website",
      url: pageUrl,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

const RESULT_STYLES: Record<string, string> = {
  correct: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
  wrong: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  "live-winning": "bg-green-500/10 border-green-500/30",
  "live-losing": "bg-red-500/10 border-red-500/30",
  pending: "bg-muted/40 border-border",
};

export default async function PickemPicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  const wallet = firstValue(resolvedSearchParams.wallet);
  const tokenIdParam = firstValue(resolvedSearchParams.tokenId);

  if (!Number.isSafeInteger(contestId) || !wallet) {
    notFound();
  }

  const result = await getWalletPickemEntries(contestId, wallet);
  if (!result) notFound();

  if (!result.entered) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No picks yet</h1>
        <p className="mt-2 text-muted-foreground">
          This wallet hasn&apos;t entered Contest #{contestId}.
        </p>
        <Link
          className="mt-6 inline-block underline"
          href={`/pickem/${contestId}`}
        >
          Go make some picks →
        </Link>
      </div>
    );
  }

  const entry = tokenIdParam
    ? (result.entries.find(e => e.tokenId === Number(tokenIdParam)) ??
      result.entries[0])
    : result.entries[0];

  const week = `${getSeasonTypeName(result.contest.seasonType)} Week ${result.contest.weekNumber} ${result.contest.year}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          {week} · Contest #{contestId}
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          {entry.gamesDecided > 0
            ? `${entry.correctPicks}/${entry.gamesDecided} correct`
            : "Picks locked in"}
        </h1>
        <div className="mt-2 flex items-center gap-2">
          {entry.rankLabel && (
            <Badge variant="secondary">{entry.rankLabel} place</Badge>
          )}
          <Badge variant="outline">
            {result.totalEntriesInContest}{" "}
            {result.totalEntriesInContest === 1 ? "entry" : "entries"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Picks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entry.picks.map(pick => (
            <div
              key={pick.number}
              className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${RESULT_STYLES[pick.result] ?? RESULT_STYLES.pending}`}
            >
              <span className="text-muted-foreground">{pick.number}.</span>
              <span className="flex-1 px-3">{pick.matchup}</span>
              <span className="font-semibold">{pick.picked ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Link className="underline" href={`/pickem/${contestId}`}>
          View contest →
        </Link>
      </div>
    </div>
  );
}
