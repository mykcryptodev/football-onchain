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

interface DexScreenerToken {
  address: string;
  name: string;
  symbol: string;
}

interface DexScreenerPair {
  chainId: string;
  baseToken: DexScreenerToken;
  quoteToken: DexScreenerToken;
  priceUsd?: string;
  liquidity?: { usd?: number };
  info?: { imageUrl?: string };
}

interface DexScreenerMatch {
  token: DexScreenerToken;
  liquidityUsd: number;
  priceUsd: number;
  imageUrl?: string;
}

// Thirdweb's token index is curated and misses a lot of newly-launched/small-cap
// tokens. DexScreener indexes anything with a live DEX pool on Base, so it's a
// free, no-key way to fill in the long tail for name/symbol search. Ranked by
// pool liquidity so illiquid/scam matches don't outrank real tokens.
async function searchDexScreener(query: string): Promise<DexScreenerMatch[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { pairs?: DexScreenerPair[] };
    const q = query.trim().toLowerCase();
    const matches = new Map<string, DexScreenerMatch>();

    for (const pair of data.pairs ?? []) {
      if (pair.chainId !== "base") continue;
      const liquidityUsd = pair.liquidity?.usd ?? 0;
      const priceUsd = Number(pair.priceUsd ?? 0);
      for (const token of [pair.baseToken, pair.quoteToken]) {
        if (!token?.address) continue;
        if (
          !token.symbol?.toLowerCase().includes(q) &&
          !token.name?.toLowerCase().includes(q)
        ) {
          continue;
        }
        const key = token.address.toLowerCase();
        const existing = matches.get(key);
        if (!existing || liquidityUsd > existing.liquidityUsd) {
          matches.set(key, {
            token,
            liquidityUsd,
            priceUsd,
            imageUrl: pair.info?.imageUrl,
          });
        }
      }
    }

    return [...matches.values()].sort(
      (a, b) => b.liquidityUsd - a.liquidityUsd,
    );
  } catch (e) {
    console.error("DexScreener search failed:", e);
    return [];
  }
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

    // Supplement name/symbol search with DexScreener on the first page only —
    // thirdweb's own pagination governs subsequent pages, and this keeps the
    // extra fetch + onchain metadata lookups to a single round.
    if (name && !isQueryTokenAddress && page === "1" && name.trim().length >= 2) {
      const existingAddresses = new Set(
        data.result.tokens.map(t => t.address.toLowerCase()),
      );
      const supplements = (await searchDexScreener(name))
        .filter(m => !existingAddresses.has(m.token.address.toLowerCase()))
        .slice(0, 5);

      if (supplements.length > 0) {
        const withMetadata = await Promise.all(
          supplements.map(async ({ token, priceUsd, imageUrl }) => {
            try {
              const tokenContract = getContract({
                client,
                chain,
                address: token.address,
              });
              const metadata = await getCurrencyMetadata({
                contract: tokenContract,
              });
              const supplementedToken: Token = {
                chainId: chain.id,
                address: token.address,
                symbol: metadata.symbol,
                name: metadata.name,
                decimals: metadata.decimals,
                priceUsd,
                iconUri: imageUrl || "",
                prices: {},
              };
              return supplementedToken;
            } catch {
              // Not a real ERC20 (e.g. a native-token pseudo-address) — skip it.
              return null;
            }
          }),
        );

        for (const token of withMetadata) {
          if (token) data.result.tokens.push(token);
        }
      }
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
