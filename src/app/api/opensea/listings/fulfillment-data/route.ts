import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!OPENSEA_API_KEY) {
      return NextResponse.json(
        { error: "OpenSea API key is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: "Missing fulfillment request payload." },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${OPENSEA_BASE_URL}/listings/fulfillment_data`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": OPENSEA_API_KEY,
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            "Failed to generate listing fulfillment data.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenSea fulfillment data error:", error);
    return NextResponse.json(
      { error: "Unexpected error while generating fulfillment data." },
      { status: 500 },
    );
  }
}
