/**
 * Renders and persists one entry's Pick'em picks share image. This module
 * is the only place that actually draws the card and uploads it to Vercel
 * Blob — the image GET route never runs any of this itself, it only reads
 * the status/blob URL that a render call here already produced.
 *
 * Two entry points:
 * - `attemptImmediateRender` — the cheap path, used right after an entry is
 *   viewed/submitted when the caller already has `contest`/`matchups` data
 *   in hand for its own display purposes. No extra chain/ESPN reads.
 * - `renderAndStoreFromScratch` — the self-contained path used by the cron
 *   retry sweep, which has nothing but a contest/token ID and must re-fetch
 *   everything.
 */
import { put } from "@vercel/blob";
import { ImageResponse } from "next/og";

import { contest, entries, matchups } from "@/lib/bankr/service";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import { loadPickemOgFonts } from "@/lib/og/pickem-card";
import {
  buildPickCardEntries,
  type PickemPicksOgCardProps,
  renderPickemPicksOgCard,
} from "@/lib/og/pickem-picks-card";
import {
  imagePathname,
  markImageReady,
  scheduleRetry,
} from "@/lib/pickem-image-status";
import { SEASON_TYPE_LABELS } from "@/lib/pickem-scoring";
import { PICKEM_OG_SIZES } from "@/lib/pickem-share";

export async function renderPickemEntryImagePng(
  cardProps: PickemPicksOgCardProps,
): Promise<Buffer> {
  const image = new ImageResponse(renderPickemPicksOgCard(cardProps), {
    ...PICKEM_OG_SIZES.og,
    fonts: await loadPickemOgFonts(getBaseUrl()),
  });
  return Buffer.from(await image.arrayBuffer());
}

async function uploadEntryImage(
  contestId: bigint,
  tokenId: bigint,
  png: Buffer,
): Promise<string> {
  const blob = await put(imagePathname(contestId, tokenId), png, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
    // A rendered image never changes in place (a fresh render always reuses
    // the same pathname deliberately), so it's safe to cache for a long time.
    cacheControlMaxAge: 31536000,
  });
  return blob.url;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function attemptImmediateRender(
  contestId: bigint,
  tokenId: bigint,
  cardProps: PickemPicksOgCardProps,
): Promise<void> {
  try {
    const png = await renderPickemEntryImagePng(cardProps);
    const blobUrl = await uploadEntryImage(contestId, tokenId, png);
    await markImageReady(contestId, tokenId, blobUrl, 1);
  } catch (error) {
    await scheduleRetry(contestId, tokenId, 1, errorMessage(error));
  }
}

export async function renderAndStoreFromScratch(
  contestId: bigint,
  tokenId: bigint,
  priorAttempts: number,
): Promise<void> {
  const attempts = priorAttempts + 1;
  try {
    const c = await contest(contestId);
    const [[entry], games] = await Promise.all([
      entries(c, [tokenId]),
      matchups(c),
    ]);
    const picks = buildPickCardEntries(games, entry.picks);
    const cardProps: PickemPicksOgCardProps = {
      contestId: Number(contestId),
      tokenId: tokenId.toString(),
      weekNumber: c.weekNumber,
      seasonTypeName: SEASON_TYPE_LABELS[c.seasonType] || "Season",
      year: Number(c.year),
      correctPicks: picks.filter(p => p.result === "correct").length,
      gamesDecided: picks.filter(p => p.result !== "pending").length,
      picks,
    };
    const png = await renderPickemEntryImagePng(cardProps);
    const blobUrl = await uploadEntryImage(contestId, tokenId, png);
    await markImageReady(contestId, tokenId, blobUrl, attempts);
  } catch (error) {
    await scheduleRetry(contestId, tokenId, attempts, errorMessage(error));
  }
}
