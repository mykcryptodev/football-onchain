import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContract, readContract } from "thirdweb";

import type { TokensResponse } from "@/app/api/tokens/route";
import { chain, pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { getBaseUrl } from "@/lib/farcaster-metadata";
import {
  buildPickemContestUrl,
  buildPickemOgImageUrl,
  buildPickemShareDescription,
  buildPickemShareTitle,
  buildPickemShareUrl,
  isEnteredShare,
  PICKEM_ENTERED_PARAM,
  PICKEM_OG_SIZES,
} from "@/lib/pickem-share";
import { client } from "@/providers/Thirdweb";

import ContestReadPending from "./ContestReadPending";
import PickemContestClient from "./PickemContestClient";

export const dynamic = "force-dynamic";

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

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Builds the share card metadata. `entered` only swaps the copy and the image
 * variant — it carries no wallet or identity data, and the page renders the
 * same either way.
 */
function buildShareMetadata({
  contestId,
  entered,
  title,
  description,
}: {
  contestId: number;
  entered: boolean;
  title: string;
  description: string;
}): Metadata {
  const baseUrl = getBaseUrl();
  const contestUrl = buildPickemContestUrl(baseUrl, contestId);
  const shareUrl = entered
    ? buildPickemShareUrl(baseUrl, contestId)
    : contestUrl;

  const ogImageUrl = buildPickemOgImageUrl({
    baseUrl,
    contestId,
    entered,
    ratio: "og",
  });
  // Farcaster mini app embeds require a 3:2 image, so they get their own size.
  const miniappImageUrl = buildPickemOgImageUrl({
    baseUrl,
    contestId,
    entered,
    ratio: "miniapp",
  });

  const miniappEmbed = {
    version: "1",
    imageUrl: miniappImageUrl,
    button: {
      title: entered ? "🏈 Beat My Picks" : "🏈 Make Your Picks",
      action: {
        type: "launch_miniapp",
        // Deliberately the clean contest URL: a viewer opening the embed did
        // not enter, so they should not re-share an "I'm in" card.
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
          ...PICKEM_OG_SIZES.og,
          alt: title,
        },
      ],
      type: "website",
      url: shareUrl,
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
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;
  const entered = isEnteredShare(resolvedSearchParams[PICKEM_ENTERED_PARAM]);

  if (!Number.isSafeInteger(contestId)) {
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

    const seasonTypeName = getSeasonTypeName(contestData.seasonType);

    return buildShareMetadata({
      contestId,
      entered,
      title: buildPickemShareTitle({
        entered,
        seasonTypeName,
        weekNumber: contestData.weekNumber,
        year: Number(contestData.year),
        contestId,
      }),
      description: buildPickemShareDescription({
        entered,
        totalEntries: Number(contestData.totalEntries),
      }),
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    // Still emit a complete card: the OG endpoint renders its own placeholders,
    // so a failed contract read degrades to a generic image, not a missing one.
    return buildShareMetadata({
      contestId,
      entered,
      title: entered ? "I'm in — Pick'em Contest" : "Pick'em Contest",
      description:
        "Onchain NFL Pick'em. Transparent entries, verifiable results, instant payouts.",
    });
  }
}

export default async function PickemContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contestId = /^\d+$/.test(id) ? Number(id) : NaN;

  if (!Number.isSafeInteger(contestId)) {
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

    if (
      !contestData ||
      Number(contestData.id) !== contestId ||
      contestData.creator === "0x0000000000000000000000000000000000000000"
    ) {
      return <ContestReadPending />;
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
    return <ContestReadPending />;
  }
}
