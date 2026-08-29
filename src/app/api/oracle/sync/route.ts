import { NextRequest, NextResponse } from "next/server";

import { notifyError } from "@/lib/oracle/discord";
import { runFullSync } from "@/lib/oracle/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFullSync();
    return NextResponse.json(result);
  } catch (e) {
    const msg = `sync route crashed: ${(e as Error).message}`;
    await notifyError(msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
