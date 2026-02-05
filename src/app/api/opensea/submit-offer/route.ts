import { NextRequest, NextResponse } from "next/server";
import { baseSepolia } from "thirdweb/chains";

import { chain } from "@/constants";

export const dynamic = "force-dynamic";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

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
    const {
      side,
      signature,
      protocol_data: protocolData,
      parameters,
      listing,
    } = body ?? {};

    if (!signature || (side !== "buy" && side !== "sell")) {
      return NextResponse.json(
        { error: "Missing required fields for OpenSea order submission." },
        { status: 400 },
      );
    }

    if (side === "sell" && !listing && !parameters && !protocolData?.parameters) {
      return NextResponse.json(
        { error: "Missing listing parameters for OpenSea listing submission." },
        { status: 400 },
      );
    }

    if (side === "buy" && !protocolData) {
      return NextResponse.json(
        { error: "Missing protocol data for OpenSea offer submission." },
        { status: 400 },
      );
    }

    const endpoint =
      side === "sell" ? "listings" : `orders/${getOpenSeaChain()}/seaport/offers`;

    const submissionPayload =
      side === "sell"
        ? (listing ?? {
            parameters: parameters ?? protocolData?.parameters,
            signature,
          })
        : {
            protocol_data: protocolData,
            signature,
          };

    const response = await fetch(`${OPENSEA_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": OPENSEA_API_KEY,
      },
      body: JSON.stringify(submissionPayload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            "Failed to submit OpenSea order.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenSea submit order error:", error);
    return NextResponse.json(
      { error: "Unexpected error while submitting OpenSea order." },
      { status: 500 },
    );
  }
}
