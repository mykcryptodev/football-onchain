import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getContract, readContract } from "thirdweb";
import type { Chain } from "thirdweb/chains";
import { contractURI } from "thirdweb/extensions/common";
import { download, resolveScheme } from "thirdweb/storage";

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
  const MISSING_ICON_URL =
    "https://static.coingecko.com/s/missing_thumb_2x-38c6e63b2e37f3b16510adf55368db6d8d8e6385629f6e9d41557762b25a6eeb.png";

  // If there's no token.iconUri, try to fetch from Coingecko, fallback to missing image if error
  let icon = token.iconUri;

  if (!icon || icon === "") {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/base/contract/${token.address}`,
      );
      if (!res.ok) throw new Error("Coingecko error");
      const json = (await res.json()) as { image?: { large?: string } };
      if (json?.image?.large) {
        icon = json.image.large;
      } else {
        icon = MISSING_ICON_URL;
      }
    } catch {
      icon = MISSING_ICON_URL;
    }
  }

  // If we still don't have an icon, try to get it from thirdweb's API directly
  if (!icon || icon === MISSING_ICON_URL) {
    try {
      const params = new URLSearchParams({
        limit: "1",
        page: "1",
        chainId: chain.id.toString(),
        tokenAddress: token.address,
      });
      const url = `https://api.thirdweb.com/v1/tokens?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "x-client-id": process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        const tokenData =
          Array.isArray(data.tokens) && data.tokens.length > 0
            ? data.tokens[0]
            : null;
        if (tokenData?.iconUri) {
          icon = tokenData.iconUri;
        }
      }
    } catch {
      // Fall through to missing icon
      icon = MISSING_ICON_URL;
    }
  }

  // if there is no icon still, try fetching it from the contract itself
  const contract = getContract({
    client,
    chain,
    address: token.address,
  });
  try {
    // try as if this is a zora token
    const ipfsUri = await contractURI({ contract });
    if (ipfsUri) {
      // Download the JSON metadata directly from IPFS
      const response = await download({
        client,
        uri: ipfsUri,
      });
      // Parse the JSON metadata from the response
      const metadataText = await response.text();
      const metadata = JSON.parse(metadataText) as {
        image?: string;
      };
      if (metadata?.image) {
        icon = metadata.image;
      } else {
        // this isnt what we want.
      }
    }
  } catch {
    // not a zora token, continue to fallback
  }

  if (!icon) {
    // try as if this is a clanker token
    try {
      const imageUrlResult = await readContract({
        contract,
        method: "function imageUrl() view returns (string)",
        params: [],
      });
      if (
        imageUrlResult &&
        typeof imageUrlResult === "string" &&
        imageUrlResult !== ""
      ) {
        icon = imageUrlResult;
      }
    } catch {
      // Not a clanker token, continue to fallback
    }
  }

  // If after all this there's still no iconUri, return the missing image
  if (!icon || icon === MISSING_ICON_URL) {
    return MISSING_ICON_URL;
  }

  // If the icon is already a full HTTP/HTTPS URL, return it directly
  // This avoids calling resolveScheme which might trigger auth middleware issues
  if (icon.startsWith("http://") || icon.startsWith("https://")) {
    return icon;
  }

  // Only use resolveScheme for IPFS or other schemes that need resolution
  // Wrap in try-catch to handle any auth or network errors gracefully
  try {
    return await resolveScheme({
      client,
      uri: icon,
    });
  } catch {
    // If resolveScheme fails (e.g., due to auth issues), fall back to missing icon
    return MISSING_ICON_URL;
  }
}
