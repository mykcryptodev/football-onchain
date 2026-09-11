import { NextResponse } from "next/server";
import { isAddress } from "viem";

import { playerProfile } from "@/lib/player-profile";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  try {
    return NextResponse.json(await playerProfile(address));
  } catch (error) {
    console.error("Error loading player profile:", error, { address });
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}
