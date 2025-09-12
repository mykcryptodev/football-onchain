import { Token } from "@/hooks/useTokens";
import { client } from "@/providers/Thirdweb";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolveScheme } from "thirdweb/storage";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveTokenIcon(token: Token) {
  if (!token.iconUri)
    return "https://static.coingecko.com/s/missing_thumb_2x-38c6e63b2e37f3b16510adf55368db6d8d8e6385629f6e9d41557762b25a6eeb.png";
  if (
    !token.iconUri.startsWith("ipfs://") &&
    !token.iconUri.startsWith("https://")
  ) {
    return token.iconUri;
  }

  return resolveScheme({
    client,
    uri: token.iconUri,
  });
}
