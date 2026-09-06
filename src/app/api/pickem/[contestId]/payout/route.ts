import { NextResponse } from "next/server";
import { readContract } from "thirdweb";
import { shortenAddress } from "thirdweb/utils";

import { pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { calculateEntryPrize } from "@/lib/pickem-prize";
import { formatPlace } from "@/lib/pickem-scoring";
import {
  buildTx,
  formatCurrencyAmount,
  PICKEM_CHAIN_ID,
  pickemContract,
  pickemNFTContract,
  readPickemContest,
  readTreasuryConstants,
} from "@/lib/pickem-skill-api";

export const dynamic = "force-dynamic";

/**
 * One-prompt payout: validates every on-chain precondition for
 * `claimAllPrizes` (games finalized, 24h payout delay elapsed, not already
 * paid out, winners exist) and, if ready, returns the single transaction
 * that pays every winner in one call. If it's not ready yet, explains
 * exactly why instead of building a transaction that would revert.
 */
export async function POST(
  _request: Request,
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

  if (contest.payoutComplete) {
    return NextResponse.json({
      ready: false,
      reason: "Payouts for this contest are already complete.",
    });
  }

  if (!contest.gamesFinalized) {
    return NextResponse.json({
      ready: false,
      reason:
        "Games for this contest aren't finalized yet — the oracle hasn't posted final results for the week.",
    });
  }

  const now = Date.now() / 1000;
  if (now < contest.payoutDeadline) {
    return NextResponse.json({
      ready: false,
      reason:
        "Payouts unlock 24 hours after games finalize, to give the oracle data time to settle.",
      unlocksAt: new Date(contest.payoutDeadline * 1000).toISOString(),
    });
  }

  const contract = pickemContract();
  const leaderboard = await readContract({
    contract,
    method: "getContestLeaderboard",
    params: [BigInt(contestId)],
  });

  if (leaderboard.length === 0) {
    return NextResponse.json({
      ready: false,
      reason: "No entries qualify for a payout in this contest.",
    });
  }

  const nftContract = pickemNFTContract();
  const { fee, denominator } = await readTreasuryConstants();
  const prizePool = await formatCurrencyAmount(
    contest.totalPrizePool,
    contest.currency,
  );

  const winners = await Promise.all(
    leaderboard.map(async (entry, index) => {
      const [owner, prediction] = await Promise.all([
        readContract({
          contract: nftContract,
          method: "ownerOf",
          params: [entry.tokenId],
        }),
        readContract({
          contract,
          method: "getUserPrediction",
          params: [entry.tokenId],
        }),
      ]);
      const prizeRaw = calculateEntryPrize(
        contest.totalPrizePool,
        fee,
        denominator,
        contest.payoutPercentages,
        index,
      );
      const prize = await formatCurrencyAmount(prizeRaw, contest.currency);
      return {
        rank: index + 1,
        rankLabel: formatPlace(index + 1),
        tokenId: Number(entry.tokenId),
        owner,
        ownerShort: shortenAddress(owner),
        correctPicks: entry.score,
        prizeFormatted: prize.formatted,
        claimed: Boolean(prediction[6]),
      };
    }),
  );

  const stillOwed = winners.filter(w => !w.claimed);
  if (stillOwed.length === 0) {
    return NextResponse.json({
      ready: false,
      reason: "Every winner has already been paid.",
      winners,
    });
  }

  const transaction = await buildTx({
    to: pickem[PICKEM_CHAIN_ID],
    method: "claimAllPrizes",
    contractParams: [BigInt(contestId)],
    contractAbi: pickemAbi,
    description: `Pay out all ${stillOwed.length} unpaid winner(s) of Contest #${contestId} in one transaction`,
  });

  return NextResponse.json({
    ready: true,
    preview: {
      totalPrizePoolFormatted: prizePool.formatted,
      winners,
      winnersRemaining: stillOwed.length,
    },
    transaction,
  });
}
