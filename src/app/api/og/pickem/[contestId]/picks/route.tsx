import { NextRequest, NextResponse } from "next/server";

import { uint } from "@/lib/bankr/service";
import { getImageStatus } from "@/lib/pickem-image-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves one entry's pre-generated picks image. This route deliberately
 * does NOT read the blockchain or ESPN — it only reads a Redis status
 * record written by the background render job (see `pickem-image.ts` /
 * `pickem-image-render.ts`) and, once ready, redirects to the persisted
 * Vercel Blob URL. Bankr and link-preview crawlers both follow redirects,
 * so this stays a drop-in replacement for the old live-rendered route.
 *
 * A missing status record (never queued, or an invalid contestId/tokenId
 * pair) and a permanently failed render both return 404 — this route has
 * no chain access to tell those cases apart, which is exactly the point.
 * A record that's still `pending` returns 503 with `Retry-After` so callers
 * know to wait rather than treat it as a permanent failure.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  try {
    const id = uint(contestId);
    const token = uint(
      request.nextUrl.searchParams.get("tokenId") || "invalid",
    );
    const record = await getImageStatus(id, token);
    if (record?.status === "ready" && record.blobUrl) {
      return NextResponse.redirect(record.blobUrl, {
        status: 307,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }
    if (record?.status === "failed") {
      return new Response("Picks image unavailable", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return new Response("Picks image not ready yet", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "5" },
    });
  } catch {
    return new Response("Picks image not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
