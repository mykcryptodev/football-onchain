import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      from,
      chainId,
      tokenAddress,
      contestAddress,
      tokenIds,
      totalCost,
      player,
    } = await req.json();

    if (
      !from ||
      !chainId ||
      !tokenAddress ||
      !contestAddress ||
      !tokenIds ||
      !totalCost ||
      !player
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Use thirdweb API MCP to batch the transactions
    const batchResult = await fetch(
      "https://api.thirdweb.com/v1/contracts/write",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.THIRDWEB_CLIENT_ID || "",
        },
        body: JSON.stringify({
          chainId: chainId,
          from: from,
          calls: [
            {
              contractAddress: tokenAddress,
              method:
                "function approve(address spender, uint256 amount) returns (bool)",
              params: [contestAddress, totalCost],
            },
            {
              contractAddress: contestAddress,
              method:
                "function claimBoxes(uint256[] tokenIds, address player) external payable",
              params: [tokenIds.map((id: number) => id.toString()), player],
              value: "0",
            },
          ],
        }),
      },
    );

    if (!batchResult.ok) {
      const errorData = await batchResult.json();
      throw new Error(
        errorData.error ||
          `Batch transaction failed: ${batchResult.statusText}`,
      );
    }

    const result = await batchResult.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error in batch-claim API:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process batch transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
