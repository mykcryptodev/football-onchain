import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

import { pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import {
  buildApproveTx,
  buildOrderedGames,
  buildTx,
  fetchWeekGames,
  formatCurrencyAmount,
  isNativeCurrency,
  needsApproval,
  PICKEM_CHAIN_ID,
  readPickemContest,
} from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

interface PickInput {
  /** 1-indexed position from the numbered game list returned by
   * GET /api/pickem/[contestId] (and shown to the user in the join prompt). */
  number: number;
  /** Team abbreviation the user picked, e.g. "NE". Case-insensitive. */
  team: string;
}

interface EntryRequestBody {
  wallet?: string;
  picks?: PickInput[];
  /** How to resolve any game not covered by `picks`. Omit to require every
   * game be picked explicitly. */
  fillRemaining?: "random" | "home" | "away";
  tiebreakerPoints?: number;
}

/**
 * Builds the exact transaction(s) to enter a Pick'em contest: an ERC-20
 * approve (if needed) followed by `submitPredictions`. Bankr never
 * hand-encodes the picks array — it collects the user's picks in natural
 * language, calls this endpoint, shows the `summary` for confirmation, then
 * submits `transactions` in order via "Submit this transaction: {json}".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId: contestIdParam } = await params;
  const contestId = Number(contestIdParam);
  if (!Number.isSafeInteger(contestId) || contestId < 0) {
    return NextResponse.json({ error: "Invalid contest id" }, { status: 400 });
  }

  let body: EntryRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { wallet, picks, fillRemaining, tiebreakerPoints } = body;

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json(
      { error: "`wallet` must be a valid address" },
      { status: 400 },
    );
  }
  if (!Array.isArray(picks)) {
    return NextResponse.json(
      { error: "`picks` must be an array of { number, team }" },
      { status: 400 },
    );
  }

  const contest = await readPickemContest(contestId);
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const now = Date.now() / 1000;
  if (now >= contest.submissionDeadline) {
    return NextResponse.json(
      {
        error: "Entries are closed for this contest.",
        submissionDeadline: new Date(
          contest.submissionDeadline * 1000,
        ).toISOString(),
      },
      { status: 409 },
    );
  }

  const weekGames = await fetchWeekGames(
    contest.year,
    contest.seasonType,
    contest.weekNumber,
  );
  const orderedGames = buildOrderedGames(contest.gameIds, weekGames);
  if (orderedGames.length !== contest.gameIds.length) {
    return NextResponse.json(
      { error: "Could not resolve every game for this contest right now. Try again shortly." },
      { status: 503 },
    );
  }

  const sideByGameId = new Map<string, 0 | 1>();
  const summaryPicks: Array<{ number: number; matchup: string; picked: string }> = [];
  const errors: string[] = [];

  for (const pick of picks) {
    const game = orderedGames.find(g => g.number === pick.number);
    if (!game) {
      errors.push(`There's no game #${pick.number} in this contest.`);
      continue;
    }
    const team = (pick.team || "").trim().toUpperCase();
    let side: 0 | 1;
    if (team === game.homeAbbr.toUpperCase()) side = 1;
    else if (team === game.awayAbbr.toUpperCase()) side = 0;
    else {
      errors.push(
        `"${pick.team}" doesn't play in game #${pick.number} (${game.matchup}).`,
      );
      continue;
    }
    sideByGameId.set(game.gameId, side);
    summaryPicks.push({ number: game.number, matchup: game.matchup, picked: team });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some picks couldn't be matched.", details: errors }, { status: 400 });
  }

  const missing = orderedGames.filter(g => !sideByGameId.has(g.gameId));
  if (missing.length > 0) {
    if (!fillRemaining) {
      return NextResponse.json(
        {
          error: "Not every game has a pick yet.",
          missingGameNumbers: missing.map(g => g.number),
          hint: 'Pass `fillRemaining: "random" | "home" | "away"` to auto-fill the rest, or provide picks for every game listed.',
        },
        { status: 400 },
      );
    }
    for (const game of missing) {
      const side: 0 | 1 =
        fillRemaining === "home"
          ? 1
          : fillRemaining === "away"
            ? 0
            : Math.random() < 0.5
              ? 0
              : 1;
      sideByGameId.set(game.gameId, side);
      summaryPicks.push({
        number: game.number,
        matchup: game.matchup,
        picked: side === 1 ? game.homeAbbr : game.awayAbbr,
      });
    }
  }
  summaryPicks.sort((a, b) => a.number - b.number);

  // Tiebreaker: use what the user gave, else default to the Vegas
  // over/under of the chronologically-last game (Pickem's own tiebreaker
  // rule — "ESPN game ID used for tiebreaker (latest game)").
  const tiebreakerGame = orderedGames[orderedGames.length - 1];
  let finalTiebreaker: number;
  let tiebreakerDefaulted = false;
  if (
    typeof tiebreakerPoints === "number" &&
    Number.isFinite(tiebreakerPoints) &&
    tiebreakerPoints >= 0
  ) {
    finalTiebreaker = Math.round(tiebreakerPoints);
  } else if (tiebreakerGame?.overUnder) {
    finalTiebreaker = Math.round(tiebreakerGame.overUnder);
    tiebreakerDefaulted = true;
  } else {
    finalTiebreaker = 45;
    tiebreakerDefaulted = true;
  }

  const picksArray = contest.gameIds.map(gameId => sideByGameId.get(gameId) ?? 0);

  const pickemAddress = pickem[PICKEM_CHAIN_ID];
  const isNative = isNativeCurrency(contest.currency);

  const submitTx = await buildTx({
    to: pickemAddress,
    // Bare method name — `contractAbi` below is the real Pickem ABI, same
    // pattern usePickemContract.ts uses for every Pickem contract call.
    method: "submitPredictions",
    contractParams: [BigInt(contestId), picksArray, BigInt(finalTiebreaker)],
    contractAbi: pickemAbi,
    value: isNative ? contest.entryFee : 0n,
    description: `Submit your picks for Contest #${contestId} (Week ${contest.weekNumber})`,
  });

  const transactions = [];
  if (!isNative && (await needsApproval({
    currency: contest.currency,
    owner: wallet,
    spender: pickemAddress,
    amount: contest.entryFee,
  }))) {
    const entryFeeFormatted = await formatCurrencyAmount(contest.entryFee, contest.currency);
    transactions.push(
      await buildApproveTx({
        currency: contest.currency,
        spender: pickemAddress,
        amount: contest.entryFee,
        description: `Approve ${entryFeeFormatted.formatted} for the Pick'em contract`,
      }),
    );
  }
  transactions.push(submitTx);

  const entryFeeFormatted = await formatCurrencyAmount(contest.entryFee, contest.currency);
  const baseUrl = getBaseUrl();

  return NextResponse.json({
    contestId,
    wallet,
    summary: {
      picks: summaryPicks,
      tiebreakerPoints: finalTiebreaker,
      tiebreakerDefaulted,
      tiebreakerGameMatchup: tiebreakerGame?.matchup ?? null,
      entryFeeFormatted: entryFeeFormatted.formatted,
    },
    transactions,
    afterSubmit: {
      picksUrl: `${baseUrl}/pickem/${contestId}/picks?wallet=${wallet}`,
    },
  });
}
