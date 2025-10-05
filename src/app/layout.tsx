import type { Metadata } from "next";
import { Geist_Mono, Lexend_Deca } from "next/font/google";
import { headers } from "next/headers";

import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  generateFarcasterMetadata,
  getBaseUrl,
} from "@/lib/farcaster-metadata";
import { FarcasterProvider } from "@/providers/Farcaster";
import ThirdwebProvider from "@/providers/Thirdweb";

import { appName } from "@/constants";
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

  return {
    title: "Football - Ultimate Football Squares and Pick Em Experience",
    description:
      "Create and join football squares contests with blockchain-powered fair play and instant payouts. The ultimate football boxes experience.",
    other: generateFarcasterMetadata({
      appName,
      imageUrl: `${baseUrl}/embed-image.png`,
      splashImageUrl: `${baseUrl}/splash-image.png`,
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
          <ThirdwebProvider>
            <FarcasterProvider>
              <Navigation />
              {children}
            </FarcasterProvider>
          </ThirdwebProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
