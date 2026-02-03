import { NextRequest, NextResponse } from "next/server";
import { baseSepolia } from "thirdweb/chains";

import { boxes, chain } from "@/constants";

export const dynamic = "force-dynamic";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_TIMEOUT_MS = 12000;

const getOpenSeaChain = () =>
  chain.id === baseSepolia.id ? "base_sepolia" : "base";

export async function POST(request: NextRequest) {
  try {
    if (!OPENSEA_API_KEY) {
      return NextResponse.json(
        { error: "OpenSea API key is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { side, offerer, tokenId, price, expirationTime } = body ?? {};

    if (!offerer || !tokenId || !price || (side !== "buy" && side !== "sell")) {
      return NextResponse.json(
        { error: "Missing required fields for OpenSea order build." },
        { status: 400 },
      );
    }

    const contractAddress = boxes[chain.id];
    if (!contractAddress) {
      return NextResponse.json(
        { error: "Boxes contract address is not configured." },
        { status: 500 },
      );
    }

    const expiresAt =
      typeof expirationTime === "number"
        ? expirationTime
        : Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    const payload = {
      offerer,
      quantity: 1,
      criteria: {
        asset: {
          contract_address: contractAddress,
          token_id: tokenId.toString(),
        },
      },
      protocol: "seaport",
      chain: getOpenSeaChain(),
      payment_token_address:
        "0x0000000000000000000000000000000000000000",
      price: price.toString(),
      expiration_time: expiresAt,
    };

    const endpoint =
      side === "sell" ? "listings/build" : "offers/build";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENSEA_TIMEOUT_MS);

    const response = await fetch(`${OPENSEA_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": OPENSEA_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            "Failed to build OpenSea order.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "OpenSea request timed out. Please try again." },
        { status: 504 },
      );
    }

    console.error("OpenSea build order error:", error);
    return NextResponse.json(
      { error: "Unexpected error while building OpenSea order." },
      { status: 500 },
    );
  }
}
