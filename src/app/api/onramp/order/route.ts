import { NextResponse } from "next/server";
import { isAddress } from "thirdweb/utils";

import { cdpFetch } from "@/lib/onramp/cdp-auth";
import { isPlausibleEmail, normalizeUsPhone } from "@/lib/onramp/helpers";
import {
  clientIp,
  isOnrampSandbox,
  onrampDomain,
  onrampErrorResponse,
  requireCredentials,
} from "@/lib/onramp/server";
import type {
  OnrampOrderFee,
  OnrampOrderRequest,
  OnrampOrderResponse,
} from "@/lib/onramp/types";

export const dynamic = "force-dynamic";

const PAYMENT_METHODS = new Set([
  "GUEST_CHECKOUT_APPLE_PAY",
  "GUEST_CHECKOUT_GOOGLE_PAY",
]);
const PURCHASE_CURRENCIES = new Set(["USDC", "ETH"]);
const VERIFICATION_ID = /^onramp_verification_[0-9a-fA-F-]+$/;
const AMOUNT = /^\d+(\.\d{1,18})?$/;

interface CdpOrderResponse {
  order: {
    orderId: string;
    paymentTotal: string;
    paymentSubtotal: string;
    paymentCurrency: string;
    purchaseAmount: string;
    purchaseCurrency: string;
    fees: OnrampOrderFee[];
  };
  paymentLink?: { url: string; paymentLinkType: string };
}

/**
 * Create a headless onramp order and return the hosted Apple Pay / Google
 * Pay button URL. Contact details must already be verified through
 * /api/onramp/verify/*.
 */
export async function POST(request: Request) {
  const auth = requireCredentials();
  if (!auth.ok) return auth.response;

  let body: Partial<OnrampOrderRequest>;
  try {
    body = (await request.json()) as Partial<OnrampOrderRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const destinationAddress =
    typeof body.destinationAddress === "string" ? body.destinationAddress : "";
  if (!isAddress(destinationAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 },
    );
  }
  const purchaseAmount =
    typeof body.purchaseAmount === "string" ? body.purchaseAmount : "";
  if (!AMOUNT.test(purchaseAmount) || Number(purchaseAmount) <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const purchaseCurrency = body.purchaseCurrency;
  if (!purchaseCurrency || !PURCHASE_CURRENCIES.has(purchaseCurrency)) {
    return NextResponse.json(
      { error: "Unsupported currency" },
      { status: 400 },
    );
  }
  const paymentMethod = body.paymentMethod;
  if (!paymentMethod || !PAYMENT_METHODS.has(paymentMethod)) {
    return NextResponse.json(
      { error: "Unsupported payment method" },
      { status: 400 },
    );
  }
  const phoneNumber = normalizeUsPhone(
    typeof body.phoneNumber === "string" ? body.phoneNumber : "",
  );
  const email =
    typeof body.email === "string" && isPlausibleEmail(body.email)
      ? body.email.trim().toLowerCase()
      : null;
  if (!phoneNumber || !email) {
    return NextResponse.json(
      { error: "Verified phone and email are required" },
      { status: 400 },
    );
  }
  const smsVerificationId =
    typeof body.smsVerificationId === "string" ? body.smsVerificationId : "";
  const emailVerificationId =
    typeof body.emailVerificationId === "string"
      ? body.emailVerificationId
      : "";
  if (
    !VERIFICATION_ID.test(smsVerificationId) ||
    !VERIFICATION_ID.test(emailVerificationId)
  ) {
    return NextResponse.json(
      { error: "Verification is missing or expired" },
      { status: 400 },
    );
  }
  const agreementAcceptedAt =
    typeof body.agreementAcceptedAt === "string" &&
    !Number.isNaN(Date.parse(body.agreementAcceptedAt))
      ? new Date(body.agreementAcceptedAt).toISOString()
      : null;
  if (!agreementAcceptedAt) {
    return NextResponse.json(
      { error: "You must accept the Coinbase terms" },
      { status: 400 },
    );
  }

  const phoneNumberVerifiedAt =
    typeof body.phoneNumberVerifiedAt === "string" &&
    !Number.isNaN(Date.parse(body.phoneNumberVerifiedAt))
      ? new Date(body.phoneNumberVerifiedAt).toISOString()
      : agreementAcceptedAt;

  const domain = onrampDomain();
  if (!domain) {
    return NextResponse.json(
      { error: "Onramp domain is not configured" },
      { status: 503 },
    );
  }

  const sandbox = isOnrampSandbox();
  const userRef = destinationAddress.toLowerCase();
  const ip = clientIp(request);

  try {
    const result = await cdpFetch<CdpOrderResponse>({
      credentials: auth.credentials,
      method: "POST",
      path: "/platform/v2/onramp/orders",
      body: {
        paymentCurrency: "USD",
        purchaseCurrency,
        purchaseAmount,
        paymentMethod,
        destinationAddress,
        destinationNetwork: "base",
        partnerUserRef: sandbox ? `sandbox-${userRef}` : userRef,
        phoneNumber,
        email,
        // Sandbox verification records (onramp_verification_00000000-…) are
        // not persisted by Coinbase, so sandbox orders rely on
        // phoneNumberVerifiedAt instead of the server-side record lookup.
        ...(sandbox ? {} : { smsVerificationId, emailVerificationId }),
        phoneNumberVerifiedAt,
        agreementAcceptedAt,
        domain,
        ...(ip ? { clientIp: ip } : {}),
      },
    });

    if (!result.paymentLink?.url) {
      return NextResponse.json(
        { error: "Coinbase did not return a payment link" },
        { status: 502 },
      );
    }

    let paymentUrl = result.paymentLink.url;
    if (sandbox) {
      const flag =
        paymentMethod === "GUEST_CHECKOUT_GOOGLE_PAY"
          ? "useGooglePaySandbox"
          : "useApplePaySandbox";
      paymentUrl += `${paymentUrl.includes("?") ? "&" : "?"}${flag}=true`;
    }

    const response: OnrampOrderResponse = {
      orderId: result.order.orderId,
      paymentUrl,
      paymentTotal: result.order.paymentTotal,
      paymentSubtotal: result.order.paymentSubtotal,
      paymentCurrency: result.order.paymentCurrency,
      purchaseAmount: result.order.purchaseAmount,
      purchaseCurrency: result.order.purchaseCurrency,
      fees: result.order.fees ?? [],
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return onrampErrorResponse(error, "Failed to create onramp order");
  }
}
