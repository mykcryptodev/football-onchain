import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolveScheme } from "thirdweb/storage";

import { chain } from "@/constants";
import { Token } from "@/hooks/useTokens";
import { client } from "@/providers/Thirdweb";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
