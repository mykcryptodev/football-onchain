import type { Metadata } from "next";
import Link from "next/link";

import CopyPicksTemplate from "@/components/pickem/CopyPicksTemplate";
import { details, uint } from "@/lib/bankr/service";
import { getBaseUrl } from "@/lib/farcaster-metadata";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  uint(id);
  const image = `${getBaseUrl()}/api/og/pickem/${id}?ratio=og`;
  return {
    title: `Make your picks · Contest #${id}`,
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
export default async function PicksTemplatePage({ params }: Props) {
  const { id } = await params;
  const data = await details(uint(id));
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="rounded-3xl bg-[#10281e] p-8 text-[#f4f4e9]">
        <p className="text-sm text-[#a8c6b4]">PICK’EM · CONTEST #{id}</p>
        <h1 className="my-3 text-4xl font-semibold">Your picks. Your call.</h1>
        <p>
          {data.contest.totalEntries.toString()} entries · {data.entryFee}{" "}
          {data.currency.symbol} per entry
        </p>
      </header>
      <p>
        Copy this card into Bankr and add your winners. “1. NE” works too. Leave
        choices blank and add “Fill in the rest randomly” if you want Bankr to
        choose those games.
      </p>
      <CopyPicksTemplate text={data.template} />
      <p>
        Tiebreaker: predict the combined points for {data.tiebreaker.matchup}.
        Send that number separately with your picks.
      </p>
      <p className="text-sm text-muted-foreground">
        {data.open
          ? "This is a blank pick card. Your entry is submitted only after Bankr confirms the entry transaction."
          : "Entries are closed. You can still view the contest and submitted picks."}
      </p>
      <Link
        className="inline-block font-semibold underline"
        href={`/pickem/${id}`}
      >
        View contest
      </Link>
    </main>
  );
}
