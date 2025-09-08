import { chain, contests } from "@/constants";
import { abi } from "@/constants/abis/contests";
import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CONTRACTS_ADDRESS = contests[chain.id];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;

    if (!contestId) {
      return NextResponse.json(
        { error: "Contest ID is required" },
        { status: 400 },
      );
    }

    if (!CONTRACTS_ADDRESS) {
      return NextResponse.json(
        { error: "Contract address not configured" },
        { status: 500 },
      );
    }

    // Get the contract instance
    const contract = getContract({
      client,
      chain: baseSepolia,
      address: CONTRACTS_ADDRESS,
      abi: abi as any, // Type assertion to bypass ABI type issues
    });

    // Call the contests function to get contest data
    const contestData = await readContract({
      contract,
      method: "contests",
      params: [parseInt(contestId)],
    });

    // Extract the data from the returned tuple
    const [
      id,
      gameId,
      creator,
      boxCost,
      boxesCanBeClaimed,
      rewardsPaid,
      totalRewards,
      boxesClaimed,
      randomValuesSet,
      title,
      description,
    ] = contestData;

    // Return the contest data
    return NextResponse.json({
      id: id.toString(),
      gameId: gameId.toString(),
      creator,
      boxCost: {
        currency: boxCost.currency,
        amount: boxCost.amount.toString(),
      },
      boxesCanBeClaimed,
      rewardsPaid: {
        q1Paid: rewardsPaid.q1Paid,
        q2Paid: rewardsPaid.q2Paid,
        q3Paid: rewardsPaid.q3Paid,
        finalPaid: rewardsPaid.finalPaid,
      },
      totalRewards: totalRewards.toString(),
      boxesClaimed: boxesClaimed.toString(),
      randomValuesSet,
      title,
      description,
    });
  } catch (error) {
    console.error("Error fetching contest data:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest data" },
      { status: 500 },
    );
  }
}
