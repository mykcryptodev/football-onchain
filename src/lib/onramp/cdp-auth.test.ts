import { generateKeyPairSync } from "node:crypto";

import { describe, expect, test } from "bun:test";
import { decodeJwt, decodeProtectedHeader } from "jose";

import { generateCdpJwt, getCdpCredentials } from "./cdp-auth";

describe("getCdpCredentials", () => {
  test("prefers split id/secret vars", () => {
    expect(
      getCdpCredentials({
        CDP_API_KEY_ID: "id-1",
        CDP_API_KEY_SECRET: "secret-1",
        CDP_API_KEY: "ignored",
      }),
    ).toEqual({ keyId: "id-1", keySecret: "secret-1" });
  });

  test("accepts the downloaded key-file JSON in CDP_API_KEY", () => {
    expect(
      getCdpCredentials({
        CDP_API_KEY: JSON.stringify({ id: "abc", privateKey: "s3cret==" }),
      }),
    ).toEqual({ keyId: "abc", keySecret: "s3cret==" });
  });

  test("accepts id:secret in CDP_API_KEY", () => {
    expect(
      getCdpCredentials({
        CDP_API_KEY: "0a1b2c3d-0000-0000-0000-000000000000:c2VjcmV0",
      }),
    ).toEqual({
      keyId: "0a1b2c3d-0000-0000-0000-000000000000",
      keySecret: "c2VjcmV0",
    });
  });

  test("rejects a bare client-style token", () => {
    expect(
      getCdpCredentials({
        CDP_API_KEY: "abcdefghijklmnopqrstuvwxyz012345",
      }),
    ).toBeNull();
    expect(getCdpCredentials({})).toBeNull();
  });
});

describe("generateCdpJwt", () => {
  test("signs an EdDSA token with CDP claims from a 64-byte Ed25519 secret", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const seed = (privateKey.export({ format: "jwk" }) as { d: string }).d;
    const pub = (publicKey.export({ format: "jwk" }) as { x: string }).x;
    const secret = Buffer.concat([
      Buffer.from(seed, "base64url"),
      Buffer.from(pub, "base64url"),
    ]).toString("base64");

    const token = await generateCdpJwt({
      credentials: { keyId: "key-123", keySecret: secret },
      method: "post",
      path: "/platform/v2/onramp/orders",
    });

    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe("EdDSA");
    expect(header.kid).toBe("key-123");
    expect(typeof header.nonce).toBe("string");

    const claims = decodeJwt(token);
    expect(claims.sub).toBe("key-123");
    expect(claims.iss).toBe("cdp");
    expect(claims.aud).toEqual(["cdp_service"]);
    expect(claims.uri).toBe(
      "POST api.cdp.coinbase.com/platform/v2/onramp/orders",
    );
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBe(120);
  });

  test("signs an ES256 token from an EC PEM", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ format: "pem", type: "sec1" }) as string;
    const token = await generateCdpJwt({
      credentials: { keyId: "ec-key", keySecret: pem.replace(/\n/g, "\\n") },
      method: "GET",
      path: "/platform/v2/onramp/orders/1",
    });
    expect(decodeProtectedHeader(token).alg).toBe("ES256");
  });
});
