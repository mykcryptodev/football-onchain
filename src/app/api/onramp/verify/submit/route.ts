import { NextResponse } from "next/server";

import { cdpFetch } from "@/lib/onramp/cdp-auth";
import { onrampErrorResponse, requireCredentials } from "@/lib/onramp/server";
import type {
  OnrampVerifySubmitRequest,
  OnrampVerifySubmitResponse,
} from "@/lib/onramp/types";

export const dynamic = "force-dynamic";

const VERIFICATION_ID = /^onramp_verification_[0-9a-fA-F-]+$/;

/** Submit the 6-digit code the user received. */
export async function POST(request: Request) {
  const auth = requireCredentials();
  if (!auth.ok) return auth.response;

  let body: Partial<OnrampVerifySubmitRequest>;
  try {
    body = (await request.json()) as Partial<OnrampVerifySubmitRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verificationId =
    typeof body.verificationId === "string" ? body.verificationId : "";
  const otpCode =
    typeof body.otpCode === "string" ? body.otpCode.replace(/\D/g, "") : "";
  if (!VERIFICATION_ID.test(verificationId)) {
    return NextResponse.json(
      { error: "Invalid verification id" },
      { status: 400 },
    );
  }
  if (otpCode.length !== 6) {
    return NextResponse.json(
      { error: "Enter the 6-digit code" },
      { status: 400 },
    );
  }

  try {
    const result = await cdpFetch<OnrampVerifySubmitResponse>({
      credentials: auth.credentials,
      method: "POST",
      path: `/platform/v2/onramp/verifications/${encodeURIComponent(verificationId)}/submit`,
      body: { otpCode },
    });
    return NextResponse.json(result);
  } catch (error) {
    return onrampErrorResponse(error, "Failed to verify code");
  }
}
