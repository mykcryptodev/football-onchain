import type { Metadata } from "next";
import { headers } from "next/headers";

import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { appName } from "@/constants";
import {
  generateFarcasterMetadata,
  getBaseUrl,
} from "@/lib/farcaster-metadata";
import { DisplayTokenProvider } from "@/providers/DisplayTokenProvider";
import { FarcasterProvider } from "@/providers/Farcaster";
import { QueryProvider } from "@/providers/QueryProvider";
import ThirdwebProvider from "@/providers/Thirdweb";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${pathname}`;
  const ogImageUrl = `${baseUrl}/og.png`;

  const title = "Football - Ultimate Football Squares and Pick'em Experience";
  const description =
    "Create and join football squares contests with blockchain-powered fair play and instant payouts. The ultimate football boxes experience.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 800,
          alt: title,
        },
      ],
      type: "website",
      url: fullUrl,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    other: generateFarcasterMetadata({
      appName,
      imageUrl: ogImageUrl,
      splashImageUrl: `${baseUrl}/icon.png`,
      splashBackgroundColor: "#000000",
      url: fullUrl,
    }),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="antialiased">
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme="system"
        >
          <QueryProvider>
            <ThirdwebProvider>
              <DisplayTokenProvider>
                <FarcasterProvider>
                  <Navigation />
                  {children}
                </FarcasterProvider>
              </DisplayTokenProvider>
            </ThirdwebProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
