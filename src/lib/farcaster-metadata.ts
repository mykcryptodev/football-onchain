import type { Metadata } from "next";

interface FarcasterMiniappConfig {
  appName: string;
  imageUrl: string;
  splashImageUrl: string;
  splashBackgroundColor?: string;
  url: string;
}

export function generateFarcasterMetadata(
  config: FarcasterMiniappConfig,
): Metadata["other"] {
  return {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: config.imageUrl,
      button: {
        title: `Launch ${config.appName}`,
        action: {
          type: "launch_miniapp",
          name: config.appName,
          url: config.url,
          splashImageUrl: config.splashImageUrl,
          splashBackgroundColor: config.splashBackgroundColor || "#000000",
        },
      },
    }),
  };
}

export function getBaseUrl(): string {
  // Check if we're in production
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check for Vercel deployment
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Default to localhost for development
  return "http://localhost:3000";
}
