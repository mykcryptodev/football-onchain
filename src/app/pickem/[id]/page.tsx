import { chain, pickem } from "@/constants";
import { abi as pickemAbi } from "@/constants/abis/pickem";
import { client } from "@/providers/Thirdweb";
import { notFound } from "next/navigation";
import { getContract, readContract } from "thirdweb";
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
}

export default async function PickemContestPage({
  params,
}: {
  params: { id: string };
}) {
  const contestId = parseInt(params.id);

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

    // Convert to frontend format
    const contest: ContestData = {
      id: Number(contestData.id),
      creator: contestData.creator,
      seasonType: contestData.seasonType,
      weekNumber: contestData.weekNumber,
      year: Number(contestData.year),
      entryFee: contestData.entryFee,
      currency:
        contestData.currency === "0x0000000000000000000000000000000000000000"
          ? "ETH"
          : "USDC",
      totalPrizePool: contestData.totalPrizePool,
      totalEntries: Number(contestData.totalEntries),
      submissionDeadline: Number(contestData.submissionDeadline) * 1000,
      gamesFinalized: contestData.gamesFinalized,
      payoutType: contestData.payoutStructure.payoutType,
      gameIds: contestData.gameIds.map(id => id.toString()),
    };

    return <PickemContestClient contest={contest} />;
  } catch (error) {
    console.error("Error fetching contest:", error);
    notFound();
  }
}
