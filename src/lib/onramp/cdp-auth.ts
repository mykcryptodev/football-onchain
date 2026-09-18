// Server-only: holds the CDP Secret API key. Import from API routes only.
import { createPrivateKey, randomBytes } from "node:crypto";

import { importJWK, type KeyLike, SignJWT } from "jose";

export const CDP_API_HOST = "api.cdp.coinbase.com";

export interface CdpCredentials {
  keyId: string;
  keySecret: string;
}

/**
 * Resolve CDP Secret API key credentials from the environment.
 *
 * Preferred: `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET`.
 * Also accepted via `CDP_API_KEY`: the downloaded key-file JSON
 * (`{"id":"…","privateKey":"…"}` or `{"name":"…","privateKey":"…"}`) or
 * `<key id>:<secret>`.
 *
 * Returns null when nothing usable is configured so the UI can hide the
 * onramp instead of failing at order time.
 */
export function getCdpCredentials(
  env: Record<string, string | undefined> = process.env,
): CdpCredentials | null {
  const id = env.CDP_API_KEY_ID?.trim();
  const secret = env.CDP_API_KEY_SECRET?.trim();
  if (id && secret) return { keyId: id, keySecret: secret };

  const combined = env.CDP_API_KEY?.trim();
  if (!combined) return null;

  if (combined.startsWith("{")) {
    try {
      const parsed = JSON.parse(combined) as {
        id?: string;
        name?: string;
        privateKey?: string;
      };
      const parsedId = parsed.id ?? parsed.name;
      if (parsedId && parsed.privateKey) {
        return { keyId: parsedId, keySecret: parsed.privateKey };
      }
    } catch {
      return null;
    }
    return null;
  }

  // "<uuid or organizations/…/apiKeys/…>:<secret>"
  const sep = combined.indexOf(":");
  if (sep > 0) {
    const maybeId = combined.slice(0, sep);
    const maybeSecret = combined.slice(sep + 1);
    if (maybeSecret.length > 0 && !maybeId.includes("//")) {
      return { keyId: maybeId, keySecret: maybeSecret };
    }
  }
  return null;
}

async function importSigningKey(
  keySecret: string,
): Promise<{ key: KeyLike | Uint8Array; alg: "EdDSA" | "ES256" }> {
  if (keySecret.includes("-----BEGIN")) {
    // ECDSA (ES256) key downloaded as PEM. Node handles SEC1 and PKCS#8.
    const pem = keySecret.replace(/\\n/g, "\n");
    return { key: createPrivateKey(pem), alg: "ES256" };
  }
  // Ed25519: base64 of 64 bytes (32-byte seed + 32-byte public key).
  const raw = Buffer.from(keySecret, "base64");
  if (raw.length !== 64) {
    throw new Error(
      "CDP API key secret must be a base64 Ed25519 key (64 bytes) or an EC PEM",
    );
  }
  const key = await importJWK(
    {
      kty: "OKP",
      crv: "Ed25519",
      d: raw.subarray(0, 32).toString("base64url"),
      x: raw.subarray(32).toString("base64url"),
    },
    "EdDSA",
  );
  return { key, alg: "EdDSA" };
}

/**
 * Build the short-lived bearer JWT CDP REST APIs require. Claims follow
 * https://docs.cdp.coinbase.com/api-reference/v2/authentication.
 */
export async function generateCdpJwt(input: {
  credentials: CdpCredentials;
  method: string;
  path: string;
  host?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const host = input.host ?? CDP_API_HOST;
  const { key, alg } = await importSigningKey(input.credentials.keySecret);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: input.credentials.keyId,
    iss: "cdp",
    aud: ["cdp_service"],
    uri: `${input.method.toUpperCase()} ${host}${input.path}`,
  })
    .setProtectedHeader({
      alg,
      typ: "JWT",
      kid: input.credentials.keyId,
      nonce: randomBytes(16).toString("hex"),
    })
    .setNotBefore(now)
    .setExpirationTime(now + (input.expiresInSeconds ?? 120))
    .sign(key);
}

export class CdpApiError extends Error {
  status: number;
  errorType?: string;
  correlationId?: string;

  constructor(input: {
    status: number;
    message: string;
    errorType?: string;
    correlationId?: string;
  }) {
    super(input.message);
    this.name = "CdpApiError";
    this.status = input.status;
    this.errorType = input.errorType;
    this.correlationId = input.correlationId;
  }
}

/** Authenticated JSON call against the CDP platform API. */
export async function cdpFetch<T>(input: {
  credentials: CdpCredentials;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}): Promise<T> {
  const jwt = await generateCdpJwt({
    credentials: input.credentials,
    method: input.method,
    path: input.path,
  });
  const response = await fetch(`https://${CDP_API_HOST}${input.path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    cache: "no-store",
  });
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!response.ok) {
    const err = (json ?? {}) as {
      errorType?: string;
      errorMessage?: string;
      correlationId?: string;
    };
    throw new CdpApiError({
      status: response.status,
      message: err.errorMessage ?? `CDP request failed (${response.status})`,
      errorType: err.errorType,
      correlationId: err.correlationId,
    });
  }
  return json as T;
}
