import { NextRequest, NextResponse } from "next/server";

import { chain } from "@/constants";

const OPENSEA_API_BASE =
  chain.id === 8453
    ? "https://api.opensea.io/api/v2"
    : "https://testnets-api.opensea.io/api/v2";

const OPENSEA_CHAIN = chain.id === 8453 ? "base" : "base_sepolia";

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
    const { signedOrder, protocolAddress } = body;

    if (!signedOrder || !protocolAddress) {
      return NextResponse.json(
        { error: "Missing signedOrder or protocolAddress" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${OPENSEA_API_BASE}/orders/${OPENSEA_CHAIN}/seaport/listings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          parameters: signedOrder.parameters,
          signature: signedOrder.signature,
          protocol_address: protocolAddress,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenSea API error:", errorText);
      return NextResponse.json(
        { error: `OpenSea API error: ${response.status}`, details: errorText },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to post order:", error);
    return NextResponse.json(
      { error: "Failed to post order to OpenSea" },
      { status: 500 },
    );
  }
}
