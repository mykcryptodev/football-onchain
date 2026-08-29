import { NextRequest, NextResponse } from "next/server";
import { decodeEventLog, type Hex } from "viem";

import { CRE_ORACLE_ABI } from "@/lib/oracle/abi";
import { notifyError } from "@/lib/oracle/discord";
import {
  syncGameScore,
  syncScoreChanges,
  syncWeekGames,
  syncWeekResults,
  type SyncResult,
} from "@/lib/oracle/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Webhook target for the oracle's *Requested events (thirdweb Insight).
 * Users trigger these from the UI via the contract's fetch* functions
 * (they pay the request gas; onchain cooldowns rate-limit them).
 * We fulfill by writing the fresh ESPN data — after re-checking onchain
 * state, so duplicate/spam events never cost us a write.
 */

const EVENT_SIGS: Record<string, "gameScores" | "scoreChanges" | "weekGames" | "weekResults"> = {
  GameScoresRequested: "gameScores",
  ScoreChangesRequested: "scoreChanges",
  WeekGamesRequested: "weekGames",
  WeekResultsRequested: "weekResults",
};

function authorized(req: NextRequest): boolean {
  const secret = process.env.ORACLE_WEBHOOK_SECRET;
  if (!secret) return false;
  // thirdweb Insight webhooks can carry a shared secret header
  return (
    req.headers.get("x-oracle-webhook-secret") === secret ||
    req.headers.get("authorization") === `Bearer ${secret}`
  );
}

interface WebhookLog {
  topics: Hex[];
  data: Hex;
}

function extractLogs(body: any): WebhookLog[] {
  // Tolerate common webhook envelope shapes: single log, array of logs,
  // or { data: { logs: [...] } } / { logs: [...] } wrappers.
  if (Array.isArray(body)) return body;
  if (body?.data?.logs) return body.data.logs;
  if (body?.logs) return body.logs;
  if (body?.topics && body?.data) return [body];
  return [];
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: SyncResult = { writes: [], skips: [], errors: [] };

  let logs: WebhookLog[];
  try {
    logs = extractLogs(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: CRE_ORACLE_ABI,
        topics: log.topics as [Hex, ...Hex[]],
        data: log.data,
      });
      const kind = EVENT_SIGS[decoded.eventName ?? ""];
      if (!kind) continue;

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
      // decodeEventLog throws on non-matching logs — that's fine, skip silently.
      // Real write failures throw from the sync* calls above.
      const msg = (e as Error).message;
      if (!msg.includes("does not match") && !msg.includes("Unable to find")) {
        result.errors.push(msg);
        await notifyError(`fulfill error: ${msg}`);
      }
    }
  }

  return NextResponse.json(result);
}
