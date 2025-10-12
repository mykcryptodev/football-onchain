import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Chain } from "thirdweb/chains";
import { resolveScheme } from "thirdweb/storage";

import { chain } from "@/constants";
import { Token } from "@/hooks/useTokens";
import { client } from "@/providers/Thirdweb";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a token address and chain to a CAIP-19 formatted string
 *
 * CAIP-19 format: chain_id + "/" + asset_namespace + ":" + asset_reference
 * For EVM chains: eip155:{chainId}/{namespace}:{tokenAddress}
 *
 * @param options - Configuration object
 * @param options.address - The token contract address
 * @param options.chain - The blockchain chain object from thirdweb
 * @param options.namespace - Optional asset namespace (defaults to "erc20")
 * @param options.tokenId - Optional token ID for NFTs (ERC721/ERC1155)
 * @returns CAIP-19 formatted string
 *
 * @example
 * ```typescript
 * // ERC20 token
 * toCaip19({
 *   address: "0x6b175474e89094c44da98b954eedeac495271d0f",
 *   chain: ethereum
 * })
 * // Returns: "eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f"
 *
 * // ERC721 NFT
 * toCaip19({
 *   address: "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d",
 *   chain: ethereum,
 *   namespace: "erc721",
 *   tokenId: "771769"
 * })
 * // Returns: "eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769"
 * ```
 *
 * @see https://chainagnostic.org/CAIPs/caip-19
 */
export function toCaip19({
  address,
  chain,
  namespace = "erc20",
  tokenId,
}: {
  address: string;
  chain: Chain;
  namespace?: "erc20" | "erc721" | "erc1155" | "slip44";
  tokenId?: string;
}): string {
  // Normalize the address to lowercase (CAIP-19 doesn't require EIP-55 checksumming)
  const normalizedAddress = address.toLowerCase();

  // Build the CAIP-2 chain ID (for EVM chains: eip155:{chainId})
  const caip2ChainId = `eip155:${chain.id}`;

  // Build the asset type: chain_id/asset_namespace:asset_reference
  let caip19 = `${caip2ChainId}/${namespace}:${normalizedAddress}`;

  // Add token ID if provided (for NFTs)
  if (tokenId) {
    caip19 += `/${tokenId}`;
  }

  return caip19;
}

export async function resolveTokenIcon(token: Token) {
  // If there's no token.iconUri, try to fetch from Coingecko, fallback to missing image if error
  let iconUri = token.iconUri;

  if (!iconUri || iconUri === "") {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${chain.name}/contract/${token.address}`,
      );
      if (!res.ok) throw new Error("Coingecko error");
      const json = (await res.json()) as { image?: { large?: string } };
      if (json?.image?.large) {
        iconUri = json.image.large;
      } else {
        iconUri =
          "https://static.coingecko.com/s/missing_thumb_2x-38c6e63b2e37f3b16510adf55368db6d8d8e6385629f6e9d41557762b25a6eeb.png";
      }
    } catch {
      iconUri =
        "https://static.coingecko.com/s/missing_thumb_2x-38c6e63b2e37f3b16510adf55368db6d8d8e6385629f6e9d41557762b25a6eeb.png";
    }
  }

  // If after all this there's still no iconUri, return the missing image
  if (!iconUri) {
    return "https://static.coingecko.com/s/missing_thumb_2x-38c6e63b2e37f3b16510adf55368db6d8d8e6385629f6e9d41557762b25a6eeb.png";
  }

  return resolveScheme({
    client,
    uri: iconUri,
  });
}
