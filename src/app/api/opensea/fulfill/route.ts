import { NextRequest, NextResponse } from "next/server";

import { chain } from "@/constants";

const OPENSEA_API_BASE =
  chain.id === 8453
    ? "https://api.opensea.io/api/v2"
    : "https://testnets-api.opensea.io/api/v2";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenSea API key not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { listing, fulfillerAddress } = body;

    if (!listing || !fulfillerAddress) {
      return NextResponse.json(
        { error: "Missing listing or fulfillerAddress" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${OPENSEA_API_BASE}/listings/fulfillment_data`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          listing: {
            hash: listing.order_hash,
            chain: listing.chain,
            protocol_address: listing.protocol_address,
          },
          fulfiller: {
            address: fulfillerAddress,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenSea fulfillment API error:", errorText);
      return NextResponse.json(
        { error: `OpenSea API error: ${response.status}`, details: errorText },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get fulfillment data:", error);
    return NextResponse.json(
      { error: "Failed to get fulfillment data" },
      { status: 500 },
    );
  }
}
