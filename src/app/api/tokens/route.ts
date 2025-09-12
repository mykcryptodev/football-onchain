import { chain } from "@/constants";
import { NextRequest, NextResponse } from "next/server";

export interface Token {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  iconUri: string;
  prices: Record<string, number>;
}

export interface TokensResponse {
  result: {
    tokens: Token[];
    pagination: {
      hasMore: boolean;
      limit: number;
      page: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get("chainId") || chain.id.toString();
    const limit = searchParams.get("limit") || "20";
    const page = searchParams.get("page") || "1";

    const response = await fetch(
      `https://api.thirdweb.com/v1/tokens?chainId=${chainId}&limit=${limit}&page=${page}`,
      {
        headers: {
          "x-secret-key": process.env.THIRDWEB_SECRET_KEY || "",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Thirdweb API error: ${response.status}`);
    }

    const data: TokensResponse = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 },
    );
  }
}
