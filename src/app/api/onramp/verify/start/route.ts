import { NextResponse } from "next/server";

import { cdpFetch } from "@/lib/onramp/cdp-auth";
import { isPlausibleEmail, normalizeUsPhone } from "@/lib/onramp/helpers";
import { onrampErrorResponse, requireCredentials } from "@/lib/onramp/server";
import type {
  OnrampVerifyStartRequest,
  OnrampVerifyStartResponse,
} from "@/lib/onramp/types";

export const dynamic = "force-dynamic";

/** Ask Coinbase to send a 6-digit code to the user's phone or email. */
export async function POST(request: Request) {
  const auth = requireCredentials();
  if (!auth.ok) return auth.response;

  let body: Partial<OnrampVerifyStartRequest>;
  try {
    body = (await request.json()) as Partial<OnrampVerifyStartRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel = body.channel;
  const rawDestination =
    typeof body.destination === "string" ? body.destination : "";
  let destination: string | null = null;
  if (channel === "sms") destination = normalizeUsPhone(rawDestination);
  else if (channel === "email")
    destination = isPlausibleEmail(rawDestination)
      ? rawDestination.trim().toLowerCase()
      : null;
  else return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

  if (!destination) {
    return NextResponse.json(
      {
        error:
          channel === "sms"
            ? "Enter a valid US mobile number"
            : "Enter a valid email address",
      },
      { status: 400 },
    );
  }

  try {
    const result = await cdpFetch<OnrampVerifyStartResponse>({
      credentials: auth.credentials,
      method: "POST",
      path: "/platform/v2/onramp/verifications",
      body: { channel, destination },
    });
    return NextResponse.json({
      verificationId: result.verificationId,
      otpExpiresAt: result.otpExpiresAt,
      destination,
    });
  } catch (error) {
    return onrampErrorResponse(error, "Failed to send verification code");
  }
}
