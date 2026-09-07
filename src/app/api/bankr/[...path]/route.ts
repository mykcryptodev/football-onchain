import { NextRequest, NextResponse } from "next/server";
import { BaseError } from "viem";

import { abi } from "@/constants/abis/pickem";
import {
  address,
  browse,
  contest,
  details,
  entries,
  entryPage,
  jsonSafe,
  leaderboard,
  matchups,
  parsePicks,
  prepareEntry,
  rpc,
  settlement,
  uint,
  wallet,
} from "@/lib/bankr/service";
import { buildPickCardEntries } from "@/lib/og/pickem-picks-card";
import { ensureEntryImage } from "@/lib/pickem-image";
import { SEASON_TYPE_LABELS } from "@/lib/pickem-scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Context = { params: Promise<{ path: string[] }> };
function response(data: unknown) {
  return NextResponse.json(jsonSafe(data), {
    headers: { "Cache-Control": "no-store" },
  });
}
function failure(error: unknown) {
  console.error("Bankr request failed", error);
  return NextResponse.json(
    {
      error:
        error instanceof BaseError
          ? "Onchain read or simulation failed. Check chain state and wallet balance before retrying."
          : error instanceof Error
            ? error.message
            : "Request failed. Do not submit a transaction.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { path } = await params;
    const cursor = Number(
      uint(request.nextUrl.searchParams.get("cursor") || "0"),
    );
    if (!Number.isSafeInteger(cursor)) throw new Error("Invalid cursor.");
    if (path.length === 1 && path[0] === "contests")
      return response(await browse(cursor));
    if (path[0] !== "contests" || !path[1])
      throw new Error("Unknown endpoint.");
    const id = uint(path[1]);
    if (path.length === 2) return response(await details(id));
    if (path.length !== 3) throw new Error("Unknown endpoint.");
    if (path[2] === "entries") {
      const owner = request.nextUrl.searchParams.get("wallet");
      const token = request.nextUrl.searchParams.get("tokenId");
      if (token !== null) {
        const tokenId = uint(token);
        const c = await contest(id);
        const ids = await rpc.readContract({
          address,
          abi,
          functionName: "getContestTokenIds",
          args: [id],
        });
        if (!ids.includes(tokenId)) throw new Error("Entry not found.");
        const [[entry], games] = await Promise.all([
          entries(c, [tokenId]),
          matchups(c),
        ]);
        const picks = buildPickCardEntries(games, entry.picks);
        const image = await ensureEntryImage(id, tokenId, {
          contestId: Number(id),
          tokenId: tokenId.toString(),
          weekNumber: c.weekNumber,
          seasonTypeName: SEASON_TYPE_LABELS[c.seasonType] || "Season",
          year: Number(c.year),
          correctPicks: picks.filter(p => p.result === "correct").length,
          gamesDecided: picks.filter(p => p.result !== "pending").length,
          picks,
        });
        return response({
          entries: [
            { ...entry, share: { ...entry.share, status: image.status } },
          ],
          nextCursor: null,
        });
      }
      return response(
        await entryPage(id, cursor, owner ? wallet(owner) : undefined),
      );
    }
    if (path[2] === "entry-count") {
      const ids = await rpc.readContract({
        address,
        abi,
        functionName: "getUserTokensForContest",
        args: [id, wallet(request.nextUrl.searchParams.get("wallet"))],
      });
      return response({
        expectedEntryCount: ids.length,
        submittedTokenIds: ids,
      });
    }
    if (path[2] === "leaderboard")
      return response(
        await leaderboard(
          id,
          Math.min(
            100,
            Math.max(
              1,
              Number(uint(request.nextUrl.searchParams.get("limit") || "10")),
            ),
          ),
          cursor,
        ),
      );
    if (path[2] === "settlement") return response(await settlement(id));
    throw new Error("Unknown endpoint.");
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { path } = await params;
    if (path.length !== 3 || path[0] !== "contests")
      throw new Error("Unknown endpoint.");
    const id = uint(path[1]);
    const raw = await request.text();
    if (raw.length > 10000) throw new Error("Request too large.");
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Expected JSON object.");
    if (path[2] === "parse") {
      if (typeof body.text !== "string")
        throw new Error("Provide text containing numbered picks.");
      const games = await matchups(await contest(id));
      return response({ ...parsePicks(body.text, games), games });
    }
    if (path[2] === "entry") return response(await prepareEntry(id, body));
    if (path[2] === "settlement")
      return response(await settlement(id, wallet(body.wallet)));
    throw new Error("Unknown endpoint.");
  } catch (error) {
    return failure(error);
  }
}
