import { NextResponse } from "next/server";

import { getCdpCredentials } from "@/lib/onramp/cdp-auth";
import { isOnrampSandbox } from "@/lib/onramp/server";
import type { OnrampStatusResponse } from "@/lib/onramp/types";

export const dynamic = "force-dynamic";

/** Tells the client whether the Apple Pay / Google Pay onramp is available. */
export async function GET() {
  const body: OnrampStatusResponse = {
    enabled: getCdpCredentials() !== null,
    sandbox: isOnrampSandbox(),
  };
  return NextResponse.json(body);
}
