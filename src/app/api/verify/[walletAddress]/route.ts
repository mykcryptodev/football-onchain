import { NextResponse } from "next/server";

import { boxes, chain } from "@/constants";
import { getNFTOwnershipFromThirdweb } from "@/lib/thirdweb-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERIFY_CONTEST_IDS = [20, 21, 22];
const BOXES_ADDRESS = boxes[chain.id];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ walletAddress: string }> },
) {
  let walletAddress: string | undefined;

  try {
    const resolvedParams = await params;
    walletAddress = resolvedParams.walletAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 },
      );
    }

    if (!BOXES_ADDRESS) {
      return NextResponse.json(
        { error: "Boxes contract address not configured" },
        { status: 500 },
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const tokenIds = VERIFY_CONTEST_IDS.flatMap(contestId =>
      Array.from({ length: 100 }, (_, index) => contestId * 100 + index),
    );
    const tokenIdStrings = tokenIds.map(id => id.toString());

    const ownersMap = await getNFTOwnershipFromThirdweb(
      BOXES_ADDRESS,
      tokenIdStrings,
    );

    const verified = tokenIdStrings.some(tokenId => {
      const owner = ownersMap.get(tokenId)?.owner;
      return owner?.toLowerCase() === normalizedWallet;
    });

    return NextResponse.json({ verified });
  } catch (error) {
    console.error("Error verifying wallet ownership:", error, {
      walletAddress,
      contestIds: VERIFY_CONTEST_IDS,
    });
    return NextResponse.json(
      { error: "Failed to verify wallet" },
      { status: 500 },
    );
  }
}
