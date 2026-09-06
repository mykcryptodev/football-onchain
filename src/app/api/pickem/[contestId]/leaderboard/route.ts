import { NextRequest, NextResponse } from "next/server";
import { readContract } from "thirdweb";
import { shortenAddress } from "thirdweb/utils";

import { calculateEntryPrize } from "@/lib/pickem-prize";
import { formatPlace, rankEntries } from "@/lib/pickem-scoring";
import {
  fetchWeekGames,
  formatCurrencyAmount,
  pickemContract,
  pickemNFTContract,
  readPickemContest,
  readTreasuryConstants,
} from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

// Reading owner + picks is one RPC round trip per entry; cap it so a very
// large contest can't turn "who's winning" into a multi-second fan-out.
const MAX_ENTRIES = 150;

/**
 * "Who's winning" for the Bankr Pick'em skill. Always computes a live
 * ranking from each entry's picks against current ESPN scores (the
 * contract's own `contestLeaderboard` only ever stores the top N = payout
 * positions, e.g. just 1 entry for a winner-take-all contest, so it can't
 * answer "who's winning" for everyone else).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId: contestIdParam } = await params;
  const contestId = Number(contestIdParam);
  if (!Number.isSafeInteger(contestId) || contestId < 0) {
    return NextResponse.json({ error: "Invalid contest id" }, { status: 400 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isSafeInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, 25)
      : 10;

  const contest = await readPickemContest(contestId);
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const contract = pickemContract();
  const nftContract = pickemNFTContract();

  const tokenIds = (
    await readContract({
      contract,
      method: "getContestTokenIds",
      params: [BigInt(contestId)],
    })
  ).map(id => Number(id));

  if (tokenIds.length === 0) {
    return NextResponse.json({
      contestId,
      status: "no_entries",
      totalEntries: 0,
      leaderboard: [],
    });
  }

  const truncated = tokenIds.length > MAX_ENTRIES;
  const scopedTokenIds = truncated ? tokenIds.slice(0, MAX_ENTRIES) : tokenIds;
  const gameIdsBigInt = contest.gameIds.map(id => BigInt(id));

  const entries = await Promise.all(
    scopedTokenIds.map(async tokenId => {
      const [owner, picks, prediction] = await Promise.all([
        readContract({ contract: nftContract, method: "ownerOf", params: [BigInt(tokenId)] }),
        readContract({
          contract,
          method: "getUserPicks",
          params: [BigInt(tokenId), gameIdsBigInt],
        }),
        readContract({
          contract,
          method: "getUserPrediction",
          params: [BigInt(tokenId)],
        }),
      ]);
      return {
        tokenId,
        owner,
        picks: picks.map(p => Number(p)),
        // getUserPrediction returns
        // [contestId, predictor, submissionTime, tiebreakerPoints, correctPicks, scoreCalculated, claimed]
        tiebreakerPoints: Number(prediction[3]),
        claimed: Boolean(prediction[6]),
      };
    }),
  );

  const weekGames = await fetchWeekGames(
    contest.year,
    contest.seasonType,
    contest.weekNumber,
  );
  const games = Array.from(weekGames.values());

  const ranked = rankEntries(
    entries,
    contest.gameIds,
    games,
    contest.tiebreakerGameId,
  );
  const byTokenId = new Map(entries.map(e => [e.tokenId, e]));

  const { fee, denominator } = await readTreasuryConstants();
  const prizePool = await formatCurrencyAmount(
    contest.totalPrizePool,
    contest.currency,
  );

  const allGamesDecided =
    games.length > 0 && games.every(g => g.completed || g.status?.toLowerCase().includes("final"));
  const status = contest.gamesFinalized || allGamesDecided ? "final" : "live";

  const leaderboard = await Promise.all(
    ranked.slice(0, limit).map(async entry => {
      const source = byTokenId.get(entry.tokenId)!;
      const isPayoutPosition = entry.rank - 1 < contest.payoutPercentages.length;
      const prizeRaw = isPayoutPosition
        ? calculateEntryPrize(
            contest.totalPrizePool,
            fee,
            denominator,
            contest.payoutPercentages,
            entry.rank - 1,
          )
        : 0n;

      return {
        rank: entry.rank,
        rankLabel: formatPlace(entry.rank),
        tokenId: entry.tokenId,
        owner: source.owner,
        ownerShort: shortenAddress(source.owner),
        correctPicks: entry.correctPicks,
        gamesDecided: entry.scoredGames,
        totalGames: contest.gameIds.length,
        tiebreakerPoints: source.tiebreakerPoints,
        isPayoutPosition,
        prizeFormatted:
          isPayoutPosition && (status === "final" || contest.gamesFinalized)
            ? (await formatCurrencyAmount(prizeRaw, contest.currency)).formatted
            : null,
        claimed: source.claimed,
      };
    }),
  );

  return NextResponse.json({
    contestId,
    status,
    totalEntries: contest.totalEntries,
    entriesRanked: tokenIds.length,
    truncated,
    totalPrizePoolFormatted: prizePool.formatted,
    payoutDeadline: contest.payoutDeadline
      ? new Date(contest.payoutDeadline * 1000).toISOString()
      : null,
    payoutComplete: contest.payoutComplete,
    leaderboard,
  });
}
