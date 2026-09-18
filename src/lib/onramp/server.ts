// Server-only helpers shared by the /api/onramp routes.
import { NextResponse } from "next/server";

import {
  CdpApiError,
  type CdpCredentials,
  getCdpCredentials,
} from "./cdp-auth";

/** `ONRAMP_SANDBOX=1` makes every order a Coinbase sandbox order (never charged). */
export function isOnrampSandbox(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const flag = env.ONRAMP_SANDBOX?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

/** Hostname Apple Pay / Google Pay buttons are rendered on (must match the CDP domain allowlist). */
export function onrampDomain(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.ONRAMP_DOMAIN?.trim() || env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    return null;
  }
}

export function requireCredentials():
  | { ok: true; credentials: CdpCredentials }
  | { ok: false; response: NextResponse } {
  const credentials = getCdpCredentials();
  if (!credentials) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Onramp is not configured" },
        { status: 503 },
      ),
    };
  }
  return { ok: true, credentials };
}

export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || undefined;
}

/** Map CDP failures onto a JSON error response without leaking key material. */
export function onrampErrorResponse(error: unknown, fallback: string) {
  if (error instanceof CdpApiError) {
    const status =
      error.status === 401 || error.status === 403
        ? 502
        : error.status >= 400 && error.status < 500
          ? error.status
          : 502;
    console.error("CDP onramp error", {
      status: error.status,
      errorType: error.errorType,
      correlationId: error.correlationId,
      message: error.message,
    });
    return NextResponse.json(
      {
        error:
          error.status === 401 || error.status === 403
            ? "Onramp is not available right now"
            : error.message,
        errorType: error.errorType,
      },
      { status },
    );
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
