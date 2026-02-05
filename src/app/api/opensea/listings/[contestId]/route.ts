import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

import { OpenSeaListing } from "@/components/contest/types";
import { boxes, chain } from "@/constants";
import {
  CACHE_TTL,
  getCancelledOrdersKey,
  getListingsCacheKey,
  redis,
  safeRedisOperation,
} from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENSEA_API_BASE =
  chain.id === 84532
    ? "https://testnets-api.opensea.io/api/v2"
    : "https://api.opensea.io/api/v2";

const COLLECTION_SLUG = "super-bowl-squares-onchain";
const SEAPORT_ADDRESS = "0x0000000000000068f116a894984e2db1123eb395";

const thirdwebClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebChain = chain.id === 84532 ? baseSepolia : base;

const seaportContract = getContract({
  client: thirdwebClient,
  address: SEAPORT_ADDRESS,
  chain: thirdwebChain,
});

interface OpenSeaListingsResponse {
  listings: OpenSeaListing[];
  next?: string;
}

async function checkOrderValid(orderHash: string): Promise<boolean> {
  try {
    const result = await readContract({
      contract: seaportContract,
      method:
        "function getOrderStatus(bytes32 orderHash) view returns (bool isValidated, bool isCancelled, uint256 totalFilled, uint256 totalSize)",
      params: [orderHash as `0x${string}`],
    });

    const [isValidated, isCancelled, totalFilled, totalSize] = result;
    const isFullyFilled = totalSize > BigInt(0) && totalFilled >= totalSize;
    const isValid = !isCancelled && !isFullyFilled;


    return isValid;
  } catch (error) {
    console.error(`Failed to check order status for ${orderHash}:`, error);
    return true;
  }
}

async function filterValidListings(
  listings: OpenSeaListing[],
): Promise<OpenSeaListing[]> {
  if (listings.length === 0) return [];

  // Get all cancelled order hashes from Redis
  const cancelledOrdersKey = getCancelledOrdersKey();
  const cancelledOrders =
    (await safeRedisOperation(() => redis?.smembers(cancelledOrdersKey), [])) ||
    [];
  const cancelledSet = new Set(cancelledOrders.map((h) => h.toLowerCase()));

  // Filter and check remaining orders
  const statusChecks = await Promise.all(
    listings.map(async (listing) => {
      const hashLower = listing.order_hash.toLowerCase();

      // Check Redis first - if marked cancelled, skip on-chain check
      if (cancelledSet.has(hashLower)) {
        return false;
      }

      // Check on-chain status
      const isValid = await checkOrderValid(listing.order_hash);

      // If on-chain says cancelled, add to Redis for future requests
      if (!isValid && redis) {
        await safeRedisOperation(
          () => redis.sadd(cancelledOrdersKey, hashLower),
          null,
        );
      }

      return isValid;
    }),
  );

  return listings.filter((_, index) => statusChecks[index]);
}

async function fetchListingsFromOpenSea(
  contestId: number,
): Promise<OpenSeaListing[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    console.warn("OPENSEA_API_KEY not configured");
    return [];
  }

  const boxesContract = boxes[chain.id];
  if (!boxesContract) {
    console.error("Boxes contract not found for chain", chain.id);
    return [];
  }

  const startTokenId = contestId * 100;
  const endTokenId = startTokenId + 99;

  const allListings: OpenSeaListing[] = [];
  let cursor: string | undefined;

  try {
    do {
      const url = new URL(
        `${OPENSEA_API_BASE}/listings/collection/${COLLECTION_SLUG}/all`,
      );
      url.searchParams.set("limit", "100");
      if (cursor) {
        url.searchParams.set("next", cursor);
      }

      const response = await fetch(url.toString(), {
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "OpenSea API error:",
          response.status,
          await response.text(),
        );
        break;
      }

      const data: OpenSeaListingsResponse = await response.json();

      const relevantListings = data.listings.filter(listing => {
        const offer = listing.protocol_data?.parameters?.offer?.[0];
        if (!offer) return false;

        const tokenId = parseInt(offer.identifierOrCriteria, 10);
        return tokenId >= startTokenId && tokenId <= endTokenId;
      });

      allListings.push(...relevantListings);
      cursor = data.next;
    } while (cursor && allListings.length < 100);

    return allListings;
  } catch (error) {
    console.error("Failed to fetch listings from OpenSea:", error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const resolvedParams = await params;
  const contestId = resolvedParams.contestId;

  if (!contestId) {
    return NextResponse.json(
      { error: "Contest ID is required" },
      { status: 400 },
    );
  }

  const chainId = chain.id;
  const cacheKey = getListingsCacheKey(contestId, chainId);

  const redisClient = redis;
  if (redisClient) {
    const cached = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      null,
    );
    if (cached) {
      const cachedListings = cached as OpenSeaListing[];
      const validListings = await filterValidListings(cachedListings);

      if (validListings.length !== cachedListings.length) {
        await safeRedisOperation(
          () =>
            redisClient.setex(
              cacheKey,
              CACHE_TTL.OPENSEA_LISTINGS,
              validListings,
            ),
          null,
        );
      }

      return NextResponse.json({
        listings: validListings,
        cached: true,
      });
    }
  }

  const allListings = await fetchListingsFromOpenSea(parseInt(contestId, 10));
  const listings = await filterValidListings(allListings);

  if (redisClient && listings.length >= 0) {
    await safeRedisOperation(
      () => redisClient.setex(cacheKey, CACHE_TTL.OPENSEA_LISTINGS, listings),
      null,
    );
  }

  return NextResponse.json({
    listings,
    cached: false,
  });
}
