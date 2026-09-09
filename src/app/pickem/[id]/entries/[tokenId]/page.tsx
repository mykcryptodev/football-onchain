import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PickemEntryOwner from "@/components/pickem/PickemEntryOwner";
import PickemShareImage from "@/components/pickem/PickemShareImage";
import TeamMark from "@/components/pickem/TeamMark";
import {
  contest,
  entries,
  matchups,
  tokenIds,
  uint,
} from "@/lib/bankr/service";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import { buildPickCardEntries } from "@/lib/og/pickem-picks-card";
import { ensureEntryImage } from "@/lib/pickem-image";
import { getImageStatus } from "@/lib/pickem-image-status";
import { SEASON_TYPE_LABELS } from "@/lib/pickem-scoring";
import { buildPickemOgImageUrl } from "@/lib/pickem-share";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; tokenId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tokenId } = await params;
  const contestId = uint(id);
  const token = uint(tokenId);
  const title = `My picks are in · Entry #${tokenId} · Contest #${id}`;
  // Point straight at the persisted blob when it's already rendered — this is
  // a Redis-only read, never blockchain/ESPN. Otherwise fall back to the
  // contest-level card so the link preview is never a broken image while the
  // entry-specific one is still pending its first render.
  const status = await getImageStatus(contestId, token);
  const image =
    status?.status === "ready" && status.blobUrl
      ? status.blobUrl
      : buildPickemOgImageUrl({
          baseUrl: getBaseUrl(),
          contestId: id,
          entered: true,
          ratio: "og",
        });
  return {
    title,
    description: "See my picks. Think you can beat me?",
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}
export default async function EntryPage({ params }: Props) {
  const { id, tokenId } = await params;
  const contestId = uint(id),
    token = uint(tokenId);
  const c = await contest(contestId);
  if (!(await tokenIds(contestId)).includes(token)) notFound();
  const [[entry], games] = await Promise.all([
    entries(c, [token]),
    matchups(c),
  ]);
  const picks = buildPickCardEntries(games, entry.picks);
  await ensureEntryImage(contestId, token, {
    contestId: Number(contestId),
    tokenId: token.toString(),
    walletAddress: entry.predictor,
    weekNumber: c.weekNumber,
    seasonTypeName: SEASON_TYPE_LABELS[c.seasonType] || "Season",
    year: Number(c.year),
    correctPicks: picks.filter(p => p.result === "correct").length,
    gamesDecided: picks.filter(p => p.result !== "pending").length,
    picks,
  });
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="rounded-3xl bg-[#10281e] p-8 text-[#f4f4e9]">
        <p className="text-sm text-[#a8c6b4]">
          PICK’EM · CONTEST #{id} · ENTRY #{tokenId}
        </p>
        <h1 className="my-3 text-5xl font-semibold">I’m in.</h1>
        <p>My picks are onchain. Think you can beat me?</p>
        <Link
          className="mt-6 inline-block rounded-full bg-[#e5ff4f] px-6 py-3 font-semibold text-[#142018]"
          href={`/pickem/${id}`}
        >
          View contest &amp; join
        </Link>
      </header>
      <PickemShareImage
        key={`${id}:${tokenId}`}
        compact
        contestId={Number(contestId)}
        tokenId={token.toString()}
      />

      <PickemEntryOwner owner={entry.owner} />
      <ol className="divide-y rounded-2xl border px-4">
        {games.map((g, i) => (
          <li key={g.gameId} className="flex items-center gap-3 py-4">
            <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground">
              {i + 1}
            </span>
            <TeamMark
              logo={g.awayLogo}
              name={g.away}
              picked={entry.picks[i] === 0}
            />
            <span className="text-xs text-muted-foreground">@</span>
            <TeamMark
              logo={g.homeLogo}
              name={g.home}
              picked={entry.picks[i] === 1}
            />
          </li>
        ))}
      </ol>
      <p>
        Tiebreaker:{" "}
        <strong>{entry.tiebreakerPoints.toString()} combined points</strong>
      </p>
      <p>
        {entry.scoreCalculated
          ? `${entry.correctPicks} correct picks · ${entry.claimed ? "Prize claimed" : "Score calculated"}`
          : "Submitted · Final scoring pending"}
      </p>
    </main>
  );
}
