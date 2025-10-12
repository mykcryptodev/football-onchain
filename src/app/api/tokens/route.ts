import { NextRequest, NextResponse } from "next/server";
import { getContract } from "thirdweb";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { isAddress } from "thirdweb/utils";

import { chain } from "@/constants";
import { resolveTokenIcon } from "@/lib/utils";
import { client } from "@/providers/Thirdweb";

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
    const name = searchParams.get("name") || "";

    // Build the API URL with optional search parameters
    const apiUrl = new URL("https://api.thirdweb.com/v1/tokens");
    apiUrl.searchParams.set("chainId", chainId);
    apiUrl.searchParams.set("limit", limit);
    apiUrl.searchParams.set("page", page);

    const isQueryTokenAddress = isAddress(name.trim());

    if (name && !isQueryTokenAddress) {
      apiUrl.searchParams.set("name", name);
    }

    if (isQueryTokenAddress) {
      apiUrl.searchParams.set("tokenAddress", name);
    }

    const response = await fetch(apiUrl.toString(), {
      headers: {
        "x-secret-key": process.env.THIRDWEB_SECRET_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Thirdweb API error: ${response.status}`);
    }

    const data: TokensResponse = await response.json();

    // if we do not get anything returned and the isQueryTokenAddress is true, fetch the token from the contract
    if (isQueryTokenAddress && data.result.tokens.length === 0) {
      const tokenContract = getContract({
        client,
        chain,
        address: name,
      });
      const tokenMetadata = await getCurrencyMetadata({
        contract: tokenContract,
      });
      const token = {
        chainId: chain.id,
        address: name,
        symbol: tokenMetadata.symbol,
        name: tokenMetadata.name,
        decimals: tokenMetadata.decimals,
        priceUsd: 0,
        iconUri: "",
        prices: {},
      };

      const image = await resolveTokenIcon(token);
      console.log({ image });

      data.result.tokens.push({
        ...token,
        iconUri: image,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 },
    );
  }
}
