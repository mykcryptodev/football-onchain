import type {
  OnrampEvent,
  OnrampEventName,
  OnrampPaymentMethod,
} from "./types";

export const ONRAMP_PAY_ORIGIN = "https://pay.coinbase.com";

const EVENT_NAMES = new Set<OnrampEventName>([
  "onramp_api.load_pending",
  "onramp_api.load_success",
  "onramp_api.load_error",
  "onramp_api.commit_success",
  "onramp_api.commit_error",
  "onramp_api.cancel",
  "onramp_api.polling_start",
  "onramp_api.polling_success",
  "onramp_api.polling_error",
]);

/**
 * Parse a `message` event payload from the Coinbase pay-button iframe.
 * Payloads arrive either as a JSON string or an already-parsed object.
 * Returns null for anything that is not an onramp event.
 */
export function parseOnrampEvent(data: unknown): OnrampEvent | null {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  const { eventName, data: inner } = payload as {
    eventName?: unknown;
    data?: unknown;
  };
  if (
    typeof eventName !== "string" ||
    !EVENT_NAMES.has(eventName as OnrampEventName)
  ) {
    return null;
  }
  const details =
    inner && typeof inner === "object"
      ? (inner as { errorCode?: unknown; errorMessage?: unknown })
      : {};
  return {
    eventName: eventName as OnrampEventName,
    errorCode:
      typeof details.errorCode === "string" ? details.errorCode : undefined,
    errorMessage:
      typeof details.errorMessage === "string"
        ? details.errorMessage
        : undefined,
  };
}

/**
 * Pick the wallet button to render. Safari (and iOS webviews) expose
 * `ApplePaySession`; Android devices get Google Pay; every other browser
 * gets Apple Pay, which Coinbase renders as a scan-with-your-phone QR flow.
 */
export function pickPaymentMethod(input: {
  userAgent: string;
  hasApplePaySession: boolean;
}): OnrampPaymentMethod {
  if (input.hasApplePaySession) return "GUEST_CHECKOUT_APPLE_PAY";
  if (/android/i.test(input.userAgent)) return "GUEST_CHECKOUT_GOOGLE_PAY";
  return "GUEST_CHECKOUT_APPLE_PAY";
}

export function paymentMethodLabel(method: OnrampPaymentMethod): string {
  return method === "GUEST_CHECKOUT_GOOGLE_PAY" ? "Google Pay" : "Apple Pay";
}

/**
 * Coinbase ticker for a contest currency, or null when the onramp can't
 * deliver that token directly (the user falls back to the swap widget).
 */
export function onrampTickerFor(
  currencyAddress: string,
  usdcAddress: string,
): "USDC" | "ETH" | null {
  const address = currencyAddress.toLowerCase();
  if (address === usdcAddress.toLowerCase()) return "USDC";
  if (address === "0x0000000000000000000000000000000000000000") return "ETH";
  return null;
}

/**
 * Human-unit amount to purchase so the wallet ends up with at least
 * `required`. Never below the full required amount's precision.
 */
export function purchaseAmountFor(input: {
  required: bigint;
  balance: bigint;
  decimals: number;
}): string {
  const { required, balance, decimals } = input;
  const shortfall = required > balance ? required - balance : BigInt(0);
  if (shortfall === BigInt(0)) return formatUnits(BigInt(0), decimals);
  return formatUnits(shortfall, decimals);
}

function formatUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals);
  return decimals === 0 ? whole : `${whole}.${frac}`;
}

/** Digits-only US phone input → E.164, or null if it isn't a 10-digit US number. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Sandbox numbers are +1000XXXXXXX (11 digits after the plus).
  if (input.trim().startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

export function isPlausibleEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export interface SavedOnrampContact {
  phoneNumber: string;
  email: string;
  smsVerificationId: string;
  emailVerificationId: string;
  /** When the phone OTP was accepted (ISO); Coinbase requires re-verification every 60 days. */
  phoneNumberVerifiedAt: string;
  /** Earliest expiry of the two verifications (ISO). */
  expiresAt: string;
}

/** Saved verifications are reusable until Coinbase's 60-day expiry, minus a day of slack. */
export function isSavedContactValid(
  saved: SavedOnrampContact | null | undefined,
  now: number,
): saved is SavedOnrampContact {
  if (!saved) return false;
  if (
    !saved.phoneNumber ||
    !saved.email ||
    !saved.smsVerificationId ||
    !saved.emailVerificationId
  ) {
    return false;
  }
  const expires = Date.parse(saved.expiresAt);
  if (Number.isNaN(expires)) return false;
  return expires - 24 * 60 * 60 * 1000 > now;
}

export function savedContactKey(address: string): string {
  return `bankrball:onramp:contact:v1:${address.toLowerCase()}`;
}
