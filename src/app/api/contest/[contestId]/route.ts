import { BoxOwner } from "@/components/contest/types";
import { boxes, chain, contests } from "@/constants";
import { abi } from "@/constants/abis/contests";
import { CACHE_TTL, getContestCacheKey, redis } from "@/lib/redis";
import { getBoxOwnersFromThirdweb } from "@/lib/thirdweb-api";
import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { stringify } from "thirdweb/utils";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CONTRACTS_ADDRESS = contests[chain.id];
const BOXES_ADDRESS = boxes[chain.id];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  // Check if this is a force refresh request
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("forceRefresh") === "true";
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

    // Check Redis cache first (if configured and not force refresh)
    let cachedContest = null;
    if (redis && !forceRefresh) {
      const cacheKey = getContestCacheKey(contestId, chain.id);
      cachedContest = await redis.get(cacheKey);

      if (cachedContest) {
        const parsedContest =
          typeof cachedContest === "string"
            ? JSON.parse(cachedContest)
            : cachedContest;

        // If cached data doesn't have boxes, invalidate cache and fetch fresh
        if (
          !("boxes" in parsedContest) ||
          !parsedContest.boxes ||
          parsedContest.boxes.length === 0
        ) {
          await redis.del(cacheKey);
        } else {
          // Disable Next.js caching for cached responses too
          const response = NextResponse.json(parsedContest);
          response.headers.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          );
          response.headers.set("Pragma", "no-cache");
          response.headers.set("Expires", "0");
          response.headers.set("Surrogate-Control", "no-store");
          return response;
        }
      }
    } else if (forceRefresh) {
      console.log(
        `Force refresh requested for contest ${contestId}, bypassing cache`,
      );
    } else {
      console.warn(
        `Redis not configured, fetching contest ${contestId} from blockchain`,
      );
    }

    // Get the contract instance
    const contract = getContract({
      client,
      chain,
      address: CONTRACTS_ADDRESS,
      abi: abi as any, // Type assertion to bypass ABI type issues
    });

    // Call the getContestData function to get contest data
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
      randomValuesSet,
      title,
      description,
      payoutStrategy,
    } = contestData;

    // Fetch box owners data
    let boxesData: BoxOwner[] = [];

    try {
      if (BOXES_ADDRESS) {
        boxesData = await getBoxOwnersFromThirdweb(
          parseInt(contestId),
          BOXES_ADDRESS,
        );
      } else {
        console.error("BOXES_ADDRESS is undefined!");
      }
    } catch (error) {
      console.error("Error fetching box owners:", error);
      // Continue without boxes data if there's an error
    }

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
      boxes: JSON.parse(stringify(boxesData)),
    };

    // Cache the contest data with 1 hour TTL (if Redis is configured)
    if (redis) {
      const cacheKey = getContestCacheKey(contestId, chain.id);
      await redis.setex(
        cacheKey,
        CACHE_TTL.CONTEST,
        JSON.stringify(formattedContestData),
      );
    }

    // Disable Next.js caching to ensure fresh data
    const response = NextResponse.json(formattedContestData);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Error fetching contest data:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest data" },
      { status: 500 },
    );
  }
}
