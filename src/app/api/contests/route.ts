import { NextResponse } from "next/server";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { stringify } from "thirdweb/utils";

import { chain, contests } from "@/constants";
import { abi } from "@/constants/abis/contests";
import {
  CACHE_TTL,
  getContestsListCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CONTRACTS_ADDRESS = contests[chain.id];

export interface ContestListItem {
  id: number;
  gameId: number;
  title: string;
  description: string;
  creator: string;
  boxCost: {
    currency: string;
    amount: string;
  };
  boxesClaimed: number;
  boxesCanBeClaimed: boolean;
  randomValuesSet: boolean;
  payoutStrategy: string;
  totalRewards: string;
  payoutsPaid: {
    totalPayoutsMade: number;
    totalAmountPaid: string;
  };
}

export async function GET() {
  try {
    if (!CONTRACTS_ADDRESS) {
      return NextResponse.json(
        { error: "Contract address not configured" },
        { status: 500 },
      );
    }

    const cacheKey = getContestsListCacheKey(chain.id);

    // Try Redis cache first
    let cachedContests = null;
    if (redis) {
      const redisClient = redis;
      cachedContests = await safeRedisOperation(
        () => redisClient.get(cacheKey),
        null,
      );

      if (cachedContests) {
        const parsedContests =
          typeof cachedContests === "string"
            ? JSON.parse(cachedContests)
            : cachedContests;
        const response = NextResponse.json(parsedContests);
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

    // Get the contract instance
    const contract = getContract({
      client,
      chain,
      address: CONTRACTS_ADDRESS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any,
    });

    // Fetch contest count
    const contestCount = await readContract({
      contract,
      method: "contestIdCounter",
      params: [],
    });

    const contestCountNumber = Number(contestCount);

    // Fetch all contests
    const contestPromises = Array.from(
      { length: contestCountNumber },
      (_, i) =>
        readContract({
          contract,
          method: "getContestData",
          params: [i],
        }).catch(error => {
          console.error(`Error fetching contest ${i}:`, error);
          return null;
        }),
    );

    const contestsData = await Promise.all(contestPromises);

    // Filter out null values (contests that failed to fetch) and format
    const formattedContests: ContestListItem[] = contestsData
      .filter((contestData): contestData is NonNullable<typeof contestData> => 
        contestData !== null
      )
      .map(contestData => ({
        id: Number(contestData.id),
        gameId: Number(contestData.gameId),
        title: contestData.title,
        description: contestData.description,
        creator: contestData.creator,
        boxCost: {
          currency: contestData.boxCost.currency,
          amount: contestData.boxCost.amount.toString(),
        },
        boxesClaimed: Number(contestData.boxesClaimed),
        boxesCanBeClaimed: contestData.boxesCanBeClaimed,
        randomValuesSet: contestData.randomValuesSet,
        payoutStrategy: contestData.payoutStrategy,
        totalRewards: contestData.totalRewards.toString(),
        payoutsPaid: {
          totalPayoutsMade: Number(contestData.payoutsPaid.totalPayoutsMade),
          totalAmountPaid: contestData.payoutsPaid.totalAmountPaid.toString(),
        },
      }));

    // Sort by contest ID descending (newest first)
    const sortedContests = formattedContests.sort((a, b) => b.id - a.id);

    // Cache the results
    if (redis) {
      const redisClient = redis;
      await safeRedisOperation(
        () =>
          redisClient.setex(
            cacheKey,
            CACHE_TTL.CONTESTS_LIST,
            JSON.stringify(sortedContests),
          ),
        null,
      );
    }

    // Return response with no-cache headers
    const response = NextResponse.json(sortedContests);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Error fetching contests list:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch contests list",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

