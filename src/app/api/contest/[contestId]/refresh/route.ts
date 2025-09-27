import { chain, contests } from "@/constants";
import { abi } from "@/constants/abis/contests";
import { CACHE_TTL, getContestCacheKey, redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract, readContract } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CONTRACTS_ADDRESS = contests[chain.id];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 },
      );
    }

    if (!CONTRACTS_ADDRESS) {
      return NextResponse.json(
        { error: "Contract address not configured" },
        { status: 500 },
      );
    }

    // Clear the cache if Redis is configured
    if (redis) {
      const cacheKey = getContestCacheKey(contestId, chain.id);
      await redis.del(cacheKey);
      console.log(
        `Cache cleared for contest ${contestId} on chain ${chain.id}`,
      );
    }

    // Get the contract instance
    const contract = getContract({
      client,
      chain,
      address: CONTRACTS_ADDRESS,
      abi: abi as any,
    });

    // Call the getContestData function to get fresh contest data
    const contestData = await readContract({
      contract,
      method: "getContestData",
      params: [parseInt(contestId)],
    });

    // Extract the data from the returned ContestView struct
    const {
      id,
      gameId,
      creator,
      rows,
      cols,
      boxCost,
      boxesCanBeClaimed,
      payoutsPaid,
      totalRewards,
      boxesClaimed,
      randomValues,
      randomValuesSet,
      title,
      description,
      payoutStrategy,
    } = contestData;

    // Format the contest data
    const formattedContestData = {
      id: id.toString(),
      gameId: gameId.toString(),
      creator,
      rows: rows.map((r: any) => parseInt(r.toString())),
      cols: cols.map((c: any) => parseInt(c.toString())),
      boxCost: {
        currency: boxCost.currency,
        amount: boxCost.amount.toString(),
      },
      boxesCanBeClaimed,
      payoutsPaid: {
        totalPayoutsMade: parseInt(payoutsPaid.totalPayoutsMade.toString()),
        totalAmountPaid: payoutsPaid.totalAmountPaid.toString(),
      },
      totalRewards: totalRewards.toString(),
      boxesClaimed: boxesClaimed.toString(),
      randomValuesSet,
      title,
      description,
      payoutStrategy,
    };

    // Cache the fresh contest data with 1 hour TTL (if Redis is configured)
    if (redis) {
      const cacheKey = getContestCacheKey(contestId, chain.id);
      await redis.setex(cacheKey, CACHE_TTL.CONTEST, formattedContestData);
      console.log(
        `Fresh contest data cached for contest ${contestId} on chain ${chain.id}`,
      );
    }

    return NextResponse.json(formattedContestData);
  } catch (error) {
    console.error("Error refreshing contest data:", error);
    return NextResponse.json(
      { error: "Failed to refresh contest data" },
      { status: 500 },
    );
  }
}
