import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContract, readContract } from "thirdweb";

import type { TokensResponse } from "@/app/api/tokens/route";
import { chain, pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import { client } from "@/providers/Thirdweb";

import PickemContestClient from "./PickemContestClient";

interface ContestData {
  id: number;
  creator: string;
  seasonType: number;
  weekNumber: number;
  year: number;
  entryFee: bigint;
  currency: string;
  totalPrizePool: bigint;
  totalEntries: number;
  submissionDeadline: number;
  gamesFinalized: boolean;
  payoutType: number;
  gameIds: string[];
  tiebreakerGameId: string;
  entryFeeUsd?: number;
}

function getSeasonTypeName(seasonType: number): string {
  switch (seasonType) {
    case 1:
      return "Preseason";
    case 2:
      return "Regular Season";
    case 3:
      return "Postseason";
    default:
      return "Season";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const contestId = parseInt(id);

  if (isNaN(contestId)) {
    return {
      title: "Contest Not Found",
    };
  }

  try {
    const pickemContract = getContract({
      client,
      chain,
      address: pickem[chain.id],
      abi: pickemAbi,
    });

    const contestData = await readContract({
      contract: pickemContract,
      method: "getContest",
      params: [BigInt(contestId)],
    });

    if (!contestData || Number(contestData.id) !== contestId) {
      return {
        title: "Contest Not Found",
      };
    }

    const baseUrl = getBaseUrl();
    const ogImageUrl = `${baseUrl}/api/og/pickem/${contestId}`;
    const contestUrl = `${baseUrl}/pickem/${contestId}`;

    const seasonTypeName = getSeasonTypeName(contestData.seasonType);
    const totalEntries = Number(contestData.totalEntries);
    const weekNumber = contestData.weekNumber;
    const year = Number(contestData.year);

    const title = `${seasonTypeName} Week ${weekNumber} ${year} - Pick'em Contest #${contestId}`;
    const description = `Join this Pick'em contest! ${totalEntries} ${totalEntries === 1 ? "entry" : "entries"} so far. Blockchain-powered fair play with instant payouts.`;

    // Farcaster mini app embed metadata
    const miniappEmbed = {
      version: "1",
      imageUrl: ogImageUrl,
      button: {
        title: "🏈 Make Your Picks",
        action: {
          type: "launch_miniapp",
          url: contestUrl,
          name: "Football Boxes",
        },
      },
    };

    // For backward compatibility
    const frameEmbed = {
      ...miniappEmbed,
      button: {
        ...miniappEmbed.button,
        action: {
          ...miniappEmbed.button.action,
          type: "launch_frame",
        },
      },
    };

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
        url: contestUrl,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
      other: {
        "fc:miniapp": JSON.stringify(miniappEmbed),
        "fc:frame": JSON.stringify(frameEmbed),
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Pick'em Contest",
    };
  }
}

export default async function PickemContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contestId = parseInt(id);

  if (isNaN(contestId)) {
    notFound();
  }

  const pickemContract = getContract({
    client,
    chain,
    address: pickem[chain.id],
    abi: pickemAbi,
  });

  try {
    const contestData = await readContract({
      contract: pickemContract,
      method: "getContest",
      params: [BigInt(contestId)],
    });

    if (!contestData || Number(contestData.id) !== contestId) {
      notFound();
    }

    // Fetch token data to get USD price
    let entryFeeUsd: number | undefined;
    try {
      const tokenResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tokens?chainId=${chain.id}&name=${contestData.currency}`,
        { cache: "no-store" },
      );

      if (tokenResponse.ok) {
        const tokenData: TokensResponse = await tokenResponse.json();
        if (tokenData.result.tokens.length > 0) {
          const token = tokenData.result.tokens[0];
          // Convert entry fee from wei to token units and multiply by USD price
          const entryFeeInTokens =
            Number(contestData.entryFee) / Math.pow(10, token.decimals);
          entryFeeUsd = entryFeeInTokens * token.priceUsd;
        }
      }
    } catch (error) {
      console.error("Error fetching token price:", error);
      // Continue without USD price if fetch fails
    }

    // Convert to frontend format
    const contest: ContestData = {
      id: Number(contestData.id),
      creator: contestData.creator,
      seasonType: contestData.seasonType,
      weekNumber: contestData.weekNumber,
      year: Number(contestData.year),
      entryFee: contestData.entryFee,
      currency: contestData.currency,
      totalPrizePool: contestData.totalPrizePool,
      totalEntries: Number(contestData.totalEntries),
      submissionDeadline: Number(contestData.submissionDeadline) * 1000,
      gamesFinalized: contestData.gamesFinalized,
      payoutType: contestData.payoutStructure.payoutType,
      gameIds: contestData.gameIds.map(id => id.toString()),
      tiebreakerGameId: contestData.tiebreakerGameId.toString(),
      entryFeeUsd,
    };

    return <PickemContestClient contest={contest} />;
  } catch (error) {
    console.error("Error fetching contest:", error);
    notFound();
  }
}
