import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  contest,
  entries,
  matchups,
  tokenIds,
  uint,
} from "@/lib/bankr/service";
import { getBaseUrl } from "@/lib/farcaster-metadata";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; tokenId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tokenId } = await params;
  uint(id);
  uint(tokenId);
  const title = `My picks are in · Entry #${tokenId} · Contest #${id}`;
  const image = `${getBaseUrl()}/api/og/pickem/${id}/picks?tokenId=${tokenId}`;
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
      <p className="break-all text-sm text-muted-foreground">
        Current owner: {entry.owner}
      </p>
      <ol className="divide-y rounded-2xl border px-4">
        {games.map((g, i) => (
          <li
            key={g.gameId}
            className="flex items-center justify-between gap-3 py-4"
          >
            <span>
              {i + 1}. {g.away} vs {g.home}
            </span>
            <strong>{entry.picks[i] === 1 ? g.home : g.away}</strong>
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
