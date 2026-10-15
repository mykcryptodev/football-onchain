/**
 * Ensures a background render is in flight for one entry's picks image,
 * without ever blocking the caller on the render itself. Call this only
 * from a single-entry lookup (the Bankr `entries?tokenId=` branch, the
 * entry page) — never from a bulk listing, or every row in a leaderboard
 * page would kick off its own render.
 */
import { after } from "next/server";

import type { PickemPicksOgCardProps } from "@/lib/og/pickem-picks-card";
import {
  attemptHolderRerender,
  attemptImmediateRender,
} from "@/lib/pickem-image-render";
import {
  claimImageJob,
  claimImageRerender,
  getImageStatus,
  type PickemImageRecord,
} from "@/lib/pickem-image-status";

export async function ensureEntryImage(
  contestId: bigint,
  tokenId: bigint,
  cardProps: PickemPicksOgCardProps,
): Promise<PickemImageRecord> {
  const existing = await getImageStatus(contestId, tokenId);
  if (existing) {
    // The card shows the current holder. After a transfer, keep serving the
    // old card while one caller redraws it for the new holder.
    const owner = cardProps.walletAddress?.toLowerCase();
    if (
      existing.status === "ready" &&
      owner &&
      existing.owner !== owner &&
      (await claimImageRerender(contestId, tokenId, owner))
    ) {
      after(() => attemptHolderRerender(contestId, tokenId, cardProps));
    }
    return existing;
  }

  // Not tracked yet: try to become the one caller that renders it. A losing
  // claim means another concurrent request just started the same render.
  const claimed = await claimImageJob(contestId, tokenId);
  const pending: PickemImageRecord = {
    status: "pending",
    attempts: 0,
    updatedAt: Date.now(),
  };
  if (!claimed) return (await getImageStatus(contestId, tokenId)) ?? pending;

  after(() => attemptImmediateRender(contestId, tokenId, cardProps));
  return pending;
}
