import { notFound } from "next/navigation";
import { getContract, readContract } from "thirdweb";

import type { TokensResponse } from "@/app/api/tokens/route";
import { chain, pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
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
  entryFeeUsd?: number;
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
      entryFeeUsd,
    };

    return <PickemContestClient contest={contest} />;
  } catch (error) {
    console.error("Error fetching contest:", error);
    notFound();
  }
}
