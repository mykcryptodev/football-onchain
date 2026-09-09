import type { Metadata } from "next";
import { Geist_Mono, Lexend_Deca } from "next/font/google";
import { headers } from "next/headers";

import { HapticButtonProvider } from "@/components/HapticButtonProvider";
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

const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const baseUrl = getBaseUrl();
  const fullUrl = `${baseUrl}${pathname}`;
  const ogImageUrl = `${baseUrl}/bankrball-og-v2.png`;

  const title = "BankrBall — Football, Onchain";
  const description =
    "Pick the winners. Follow every game. Play NFL Pick’em and football squares with friends on Base.";

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
          height: 630,
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
      <body
        className={`${lexendDeca.variable} ${geistMono.variable} antialiased`}
      >
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
                  <HapticButtonProvider />
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
