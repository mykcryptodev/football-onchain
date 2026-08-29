import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { decodeEventLog, type Hex, toEventSelector } from "viem";

import { CRE_ORACLE_ABI } from "@/lib/oracle/abi";
import { notifyError } from "@/lib/oracle/discord";
import {
  syncGameScore,
  type SyncResult,
  syncScoreChanges,
  syncWeekGames,
  syncWeekResults,
} from "@/lib/oracle/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Webhook target for the oracle's *Requested events (thirdweb Insight).
 * Users trigger these from the UI via the contract's fetch* functions
 * (they pay the request gas; onchain cooldowns rate-limit them).
 * We fulfill by writing the fresh ESPN data — after re-checking onchain
 * state, so duplicate/spam events never cost us a write.
 *
 * Auth: thirdweb signs every delivery with the webhook's secret —
 * header `x-webhook-signature` = HMAC-SHA256 hex of the RAW body.
 * ORACLE_WEBHOOK_SECRET must be the secret thirdweb shows after
 * creating the webhook (Project → Tokens → Webhooks).
 */

// Pre-filter on topics[0] so foreign logs in the same delivery (test events,
// other contracts) are skipped before decodeEventLog can throw on them.
const REQUESTED_SELECTORS: Record<
  string,
  "gameScores" | "scoreChanges" | "weekGames" | "weekResults"
> = {
  [toEventSelector("GameScoresRequested(uint256,bytes32)")]: "gameScores",
  [toEventSelector("ScoreChangesRequested(uint256,bytes32)")]: "scoreChanges",
  [toEventSelector("WeekGamesRequested(uint256,bytes32)")]: "weekGames",
  [toEventSelector("WeekResultsRequested(uint256,bytes32)")]: "weekResults",
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.ORACLE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookLog {
  topics: Hex[];
  data: Hex;
}

interface InsightEventItem {
  status?: string;
  data?: WebhookLog;
}

function extractLogs(body: unknown): WebhookLog[] {
  if (Array.isArray(body)) return body as WebhookLog[];
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  // thirdweb Insight envelope: { topic: "v1.events", timestamp, data: [{ data: { topics, data, ... }, status, type, id }] }
  if (b.topic === "v1.events" && Array.isArray(b.data)) {
    return (b.data as InsightEventItem[])
      .filter((item) => item?.status === "new" && item?.data?.topics)
      .map((item) => item.data as WebhookLog);
  }
  // Tolerate other shapes: { data: { logs: [...] } } / { logs: [...] } wrappers, single log.
  const nested = b.data as { logs?: WebhookLog[] } | undefined;
  if (nested && Array.isArray(nested.logs)) return nested.logs;
  if (Array.isArray(b.logs)) return b.logs as WebhookLog[];
  if (Array.isArray(b.topics) && typeof b.data === "string")
    return [b as unknown as WebhookLog];
  return [];
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: SyncResult = { writes: [], skips: [], errors: [] };

  let logs: WebhookLog[];
  try {
    logs = extractLogs(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  for (const log of logs) {
    const kind = REQUESTED_SELECTORS[log.topics[0] ?? ""];
    if (!kind) continue;
    try {
      const decoded = decodeEventLog({
        abi: CRE_ORACLE_ABI,
        topics: log.topics as [Hex, ...Hex[]],
        data: log.data,
      });

      const args = decoded.args as { gameId?: bigint; weekId?: bigint };
      if (kind === "gameScores" && args.gameId !== undefined) {
        await syncGameScore(args.gameId, result);
      } else if (kind === "scoreChanges" && args.gameId !== undefined) {
        await syncScoreChanges(args.gameId, result);
      } else if (kind === "weekGames" && args.weekId !== undefined) {
        await syncWeekGames(args.weekId, result);
      } else if (kind === "weekResults" && args.weekId !== undefined) {
        await syncWeekResults(args.weekId, result);
      }
    } catch (e) {
      // Selector matched but decode/sync failed — real error, alert.
      const msg = (e as Error).message;
      result.errors.push(msg);
      await notifyError(`fulfill error: ${msg}`);
    }
  }

  return NextResponse.json(result);
}
