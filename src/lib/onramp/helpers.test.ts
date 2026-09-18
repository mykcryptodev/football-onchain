import { describe, expect, test } from "bun:test";

import {
  isSavedContactValid,
  normalizeUsPhone,
  onrampTickerFor,
  parseOnrampEvent,
  pickPaymentMethod,
  purchaseAmountFor,
} from "./helpers";

describe("parseOnrampEvent", () => {
  test("parses a stringified success event", () => {
    expect(
      parseOnrampEvent(
        JSON.stringify({ eventName: "onramp_api.polling_success", data: {} }),
      ),
    ).toEqual({
      eventName: "onramp_api.polling_success",
      errorCode: undefined,
      errorMessage: undefined,
    });
  });

  test("parses an object error event with details", () => {
    expect(
      parseOnrampEvent({
        eventName: "onramp_api.commit_error",
        data: {
          errorCode: "ERROR_CODE_GUEST_CARD_SOFT_DECLINED",
          errorMessage: "Declined",
        },
      }),
    ).toEqual({
      eventName: "onramp_api.commit_error",
      errorCode: "ERROR_CODE_GUEST_CARD_SOFT_DECLINED",
      errorMessage: "Declined",
    });
  });

  test("ignores unrelated messages", () => {
    expect(parseOnrampEvent("not json")).toBeNull();
    expect(parseOnrampEvent({ eventName: "react-devtools" })).toBeNull();
    expect(parseOnrampEvent(null)).toBeNull();
  });
});

describe("pickPaymentMethod", () => {
  test("Apple Pay when ApplePaySession exists", () => {
    expect(
      pickPaymentMethod({ userAgent: "Mozilla", hasApplePaySession: true }),
    ).toBe("GUEST_CHECKOUT_APPLE_PAY");
  });

  test("Google Pay on Android", () => {
    expect(
      pickPaymentMethod({
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome",
        hasApplePaySession: false,
      }),
    ).toBe("GUEST_CHECKOUT_GOOGLE_PAY");
  });

  test("Apple Pay (QR fallback) elsewhere", () => {
    expect(
      pickPaymentMethod({
        userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome",
        hasApplePaySession: false,
      }),
    ).toBe("GUEST_CHECKOUT_APPLE_PAY");
  });
});

describe("onrampTickerFor", () => {
  const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  test("USDC regardless of case", () => {
    expect(onrampTickerFor(usdc.toLowerCase(), usdc)).toBe("USDC");
  });
  test("ETH for the zero address", () => {
    expect(
      onrampTickerFor("0x0000000000000000000000000000000000000000", usdc),
    ).toBe("ETH");
  });
  test("null for other tokens", () => {
    expect(
      onrampTickerFor("0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", usdc),
    ).toBeNull();
  });
});

describe("purchaseAmountFor", () => {
  test("formats the shortfall in human units", () => {
    expect(
      purchaseAmountFor({
        required: BigInt(1_000_000),
        balance: BigInt(250_000),
        decimals: 6,
      }),
    ).toBe("0.750000");
  });
  test("full fee when balance is zero", () => {
    expect(
      purchaseAmountFor({
        required: BigInt(1_000_000),
        balance: BigInt(0),
        decimals: 6,
      }),
    ).toBe("1.000000");
  });
  test("zero when already funded", () => {
    expect(
      purchaseAmountFor({
        required: BigInt(5),
        balance: BigInt(9),
        decimals: 6,
      }),
    ).toBe("0.000000");
  });
});

describe("normalizeUsPhone", () => {
  test("10 digits → +1", () => {
    expect(normalizeUsPhone("(205) 555-5555")).toBe("+12055555555");
  });
  test("11 digits with leading 1", () => {
    expect(normalizeUsPhone("1 205 555 5555")).toBe("+12055555555");
  });
  test("sandbox number passes through", () => {
    expect(normalizeUsPhone("+10005550100")).toBe("+10005550100");
  });
  test("rejects short input", () => {
    expect(normalizeUsPhone("555-5555")).toBeNull();
  });
});

describe("isSavedContactValid", () => {
  const base = {
    phoneNumber: "+12055555555",
    email: "a@b.co",
    smsVerificationId: "sms",
    emailVerificationId: "email",
    phoneNumberVerifiedAt: "2026-09-17T00:00:00Z",
  };
  const now = Date.parse("2026-09-18T00:00:00Z");

  test("valid when expiry is comfortably in the future", () => {
    expect(
      isSavedContactValid({ ...base, expiresAt: "2026-10-18T00:00:00Z" }, now),
    ).toBe(true);
  });
  test("invalid inside the one-day slack window", () => {
    expect(
      isSavedContactValid({ ...base, expiresAt: "2026-09-18T12:00:00Z" }, now),
    ).toBe(false);
  });
  test("invalid when fields are missing", () => {
    expect(
      isSavedContactValid(
        { ...base, smsVerificationId: "", expiresAt: "2026-10-18T00:00:00Z" },
        now,
      ),
    ).toBe(false);
    expect(isSavedContactValid(null, now)).toBe(false);
  });
});
