import { NextRequest, NextResponse } from "next/server";

import { renderAndStoreFromScratch } from "@/lib/pickem-image-render";
import {
  claimDueRetries,
  claimExpiredRetention,
  deleteImageRecord,
  getImageStatus,
} from "@/lib/pickem-image-status";

/**
 * Sweeps the retry queue and the retention index for pre-generated Pick'em
 * entry images. This is the ONLY place `renderAndStoreFromScratch` (the
 * self-contained render path, which re-reads the chain and ESPN) gets
 * called from — the image GET route never triggers a render itself.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RETRY_BATCH = 20;
const RETENTION_BATCH = 50;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await claimDueRetries(RETRY_BATCH);
  let retried = 0;
  for (const { contestId, tokenId } of due) {
    const priorAttempts = (await getImageStatus(contestId, tokenId))?.attempts ?? 0;
    await renderAndStoreFromScratch(contestId, tokenId, priorAttempts);
    retried++;
  }

  const expired = await claimExpiredRetention(RETENTION_BATCH);
  for (const { contestId, tokenId } of expired) {
    await deleteImageRecord(contestId, tokenId);
  }

  return NextResponse.json({ retried, expired: expired.length });
}
