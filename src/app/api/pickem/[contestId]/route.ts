import { NextRequest, NextResponse } from "next/server";

import { pickem } from "@/constants";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import {
  buildOrderedGames,
  fetchWeekGames,
  formatCurrencyAmount,
  getSeasonTypeName,
  PICKEM_CHAIN_ID,
  readPickemContest,
} from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

/**
 * Contest overview for the Bankr Pick'em skill: status flags, formatted
 * money, and the numbered chronological game list used to build the
 * "1. CLE @ NE" join/pick template. See public/skills/pickem/SKILL.md.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId: contestIdParam } = await params;
  const contestId = Number(contestIdParam);

  if (!Number.isSafeInteger(contestId) || contestId < 0) {
    return NextResponse.json({ error: "Invalid contest id" }, { status: 400 });
  }

  const contest = await readPickemContest(contestId);
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const weekGames = await fetchWeekGames(
    contest.year,
    contest.seasonType,
    contest.weekNumber,
  );
  const games = buildOrderedGames(contest.gameIds, weekGames);

  const [entryFee, prizePool] = await Promise.all([
    formatCurrencyAmount(contest.entryFee, contest.currency),
    formatCurrencyAmount(contest.totalPrizePool, contest.currency),
  ]);

  const now = Date.now() / 1000;
  const submissionOpen = now < contest.submissionDeadline;
  const payoutReady =
    contest.gamesFinalized &&
    !contest.payoutComplete &&
    now >= contest.payoutDeadline;

  const payoutLabel =
    contest.payoutType === 0
      ? "Winner take all"
      : contest.payoutType === 1
        ? "Top 3 (60% / 30% / 10%)"
        : contest.payoutType === 2
          ? "Top 5 (40% / 25% / 15% / 12% / 8%)"
          : "Custom";

  const baseUrl = getBaseUrl();

  return NextResponse.json({
    contestId: contest.id,
    contractAddress: pickem[PICKEM_CHAIN_ID],
    chainId: PICKEM_CHAIN_ID,
    season: {
      seasonType: contest.seasonType,
      seasonTypeName: getSeasonTypeName(contest.seasonType),
      year: contest.year,
      weekNumber: contest.weekNumber,
    },
    entryFee: {
      raw: contest.entryFee.toString(),
      formatted: entryFee.formatted,
      currency: contest.currency,
    },
    totalPrizePool: {
      raw: contest.totalPrizePool.toString(),
      formatted: prizePool.formatted,
    },
    totalEntries: contest.totalEntries,
    submissionDeadline: new Date(contest.submissionDeadline * 1000).toISOString(),
    submissionOpen,
    gamesFinalized: contest.gamesFinalized,
    payoutComplete: contest.payoutComplete,
    payoutDeadline: contest.payoutDeadline
      ? new Date(contest.payoutDeadline * 1000).toISOString()
      : null,
    payoutReady,
    payoutType: contest.payoutType,
    payoutLabel,
    games,
    tiebreakerGameNumber: games.length > 0 ? games[games.length - 1].number : null,
    urls: {
      contestPage: `${baseUrl}/pickem/${contest.id}`,
      picksPage: `${baseUrl}/pickem/${contest.id}/picks`,
    },
  });
}
