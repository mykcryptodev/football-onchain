import { NextRequest, NextResponse } from "next/server";
import {
  createThirdwebClient,
  getContract,
  readContract,
  ZERO_ADDRESS,
} from "thirdweb";
import { stringify } from "thirdweb/utils";

import { BoxOwner } from "@/components/contest/types";
import { boxes, chain, contests } from "@/constants";
import { abi } from "@/constants/abis/contests";
import {
  CACHE_TTL,
  getContestCacheKey,
  getPayoutTxKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";
import { getBoxOwnersFromThirdweb } from "@/lib/thirdweb-api";

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
  let contestId: string | undefined;
  try {
    const resolvedParams = await params;
    contestId = resolvedParams.contestId;

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

    // Get the contract instance
    const contract = getContract({
      client,
      chain,
      address: CONTRACTS_ADDRESS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any, // Type assertion needed for complex contract ABI
    });

    // Call the getContestData function to get contest data
    let contestData;
    try {
      contestData = await readContract({
        contract,
        method: "getContestData",
        params: [parseInt(contestId)],
      });

      // Validate that we got valid contest data
      if (!contestData) {
        throw new Error("Contest data is null or undefined");
      }

      // Check if contest exists (creator should not be zero address for valid contests)
      if (!contestData.creator || contestData.creator === ZERO_ADDRESS) {
        return NextResponse.json(
          { error: "Contest not found" },
          { status: 404 },
        );
      }
    } catch (contractError) {
      console.error("Error calling getContestData:", contractError);
      console.error("Contest ID:", contestId);
      console.error("Contract address:", CONTRACTS_ADDRESS);
      console.error("Chain ID:", chain.id);

      // If it's a revert error, return 404 instead of 500
      const errorMessage =
        contractError instanceof Error
          ? contractError.message
          : String(contractError);
      if (
        errorMessage.includes("revert") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist")
      ) {
        return NextResponse.json(
          { error: "Contest not found" },
          { status: 404 },
        );
      }

      throw contractError;
    }

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

    // Convert on-chain rows/cols to arrays of numbers for comparison
    const onChainRows = rows.map((r: bigint) => parseInt(r.toString()));
    const onChainCols = cols.map((c: bigint) => parseInt(c.toString()));

    // Check Redis cache (if configured and not force refresh)
    let cachedContest = null;
    let shouldUseCache = false;
    if (redis && !forceRefresh) {
      const redisClient = redis; // Capture for TypeScript narrowing
      const cacheKey = getContestCacheKey(contestId, chain.id);
      cachedContest = await safeRedisOperation(
        () => redisClient.get(cacheKey),
        null,
      );

      if (cachedContest) {
        const parsedContest =
          typeof cachedContest === "string"
            ? JSON.parse(cachedContest)
            : cachedContest;

        // Check if cached data has boxes
        const hasBoxes =
          "boxes" in parsedContest &&
          parsedContest.boxes &&
          parsedContest.boxes.length > 0;

        // Check if randomValuesSet changed from false to true
        const cachedRandomValuesSet = parsedContest.randomValuesSet ?? false;
        const randomValuesJustSet = !cachedRandomValuesSet && randomValuesSet;

        // Check if rows/cols have changed (compare arrays)
        const rowsChanged =
          !parsedContest.rows ||
          JSON.stringify(parsedContest.rows) !== JSON.stringify(onChainRows);
        const colsChanged =
          !parsedContest.cols ||
          JSON.stringify(parsedContest.cols) !== JSON.stringify(onChainCols);

        // If random numbers were just set or rows/cols changed, invalidate cache
        if (randomValuesJustSet || rowsChanged || colsChanged) {
          console.log(
            `Invalidating cache for contest ${contestId}: randomValuesSet=${randomValuesJustSet}, rowsChanged=${rowsChanged}, colsChanged=${colsChanged}`,
          );
          await safeRedisOperation(() => redisClient.del(cacheKey), null);
          cachedContest = null;
        } else if (hasBoxes) {
          // Cache is valid and has boxes, use cached data
          shouldUseCache = true;
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

    // Return cached data if it's valid and fresh
    if (shouldUseCache && cachedContest) {
      const parsedContest =
        typeof cachedContest === "string"
          ? JSON.parse(cachedContest)
          : cachedContest;
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

    // Fetch payout transaction hash from Redis if payouts have been made
    let payoutTransactionHash: string | null = null;
    if (payoutsPaid.totalPayoutsMade > 0 && redis) {
      const redisClient = redis; // Capture for TypeScript narrowing
      const payoutTxKey = getPayoutTxKey(contestId, chain.id);
      const storedTxHash = await safeRedisOperation(
        () => redisClient.get(payoutTxKey),
        null,
      );
      if (storedTxHash && typeof storedTxHash === "string") {
        payoutTransactionHash = storedTxHash;
      }
    }

    // Format the contest data
    const formattedContestData = {
      id: id.toString(),
      gameId: gameId.toString(),
      creator,
      rows: onChainRows,
      cols: onChainCols,
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
      payoutTransactionHash,
      boxes: JSON.parse(stringify(boxesData)),
    };

    // Cache the contest data with 1 hour TTL (if Redis is configured)
    if (redis) {
      const redisClient = redis; // Capture for TypeScript narrowing
      const cacheKey = getContestCacheKey(contestId, chain.id);
      await safeRedisOperation(
        () =>
          redisClient.setex(
            cacheKey,
            CACHE_TTL.CONTEST,
            JSON.stringify(formattedContestData),
          ),
        null,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      contestId: contestId || "unknown",
      contractAddress: CONTRACTS_ADDRESS,
      chainId: chain.id,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch contest data",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
