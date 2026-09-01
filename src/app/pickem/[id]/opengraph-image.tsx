import { ImageResponse } from "next/og";

import { getBaseUrl } from "@/lib/farcaster-metadata";
import { loadPickemOgFonts, renderPickemOgCard } from "@/lib/og/pickem-card";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

export const runtime = "edge";
export const alt = "Pick'em Contest";
export const size = PICKEM_OG_SIZES.og;
export const contentType = "image/png";

// Fallback for the file-convention route. The contest-aware image that share
// metadata points at lives at /api/og/pickem/[contestId].
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return new ImageResponse(
    renderPickemOgCard({
      ratio: "og",
      entered: false,
      contestId: Number(id),
      weekNumber: 0,
      seasonTypeName: "Season",
      year: new Date().getFullYear(),
      prizePool: "—",
      entriesLabel: "Loading contest",
      playersLabel: null,
    }),
    {
      ...size,
      fonts: await loadPickemOgFonts(getBaseUrl()),
    },
  );
}
