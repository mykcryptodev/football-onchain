/** Shared client/server types for the Coinbase headless onramp integration. */

export type OnrampPaymentMethod =
  | "GUEST_CHECKOUT_APPLE_PAY"
  | "GUEST_CHECKOUT_GOOGLE_PAY";

export type OnrampChannel = "sms" | "email";

export interface OnrampStatusResponse {
  /** Server has CDP credentials and can create orders. */
  enabled: boolean;
  /** Orders are created with a `sandbox-` partnerUserRef (never charged). */
  sandbox: boolean;
}

export interface OnrampVerifyStartRequest {
  channel: OnrampChannel;
  destination: string;
}

export interface OnrampVerifyStartResponse {
  verificationId: string;
  otpExpiresAt: string;
}

export interface OnrampVerifySubmitRequest {
  verificationId: string;
  otpCode: string;
}

export interface OnrampVerifySubmitResponse {
  verificationId: string;
  verificationExpiresAt: string;
}

export interface OnrampOrderRequest {
  destinationAddress: string;
  /** Crypto amount to receive, in human units (e.g. "1.000000"). */
  purchaseAmount: string;
  /** Coinbase ticker, e.g. USDC or ETH. */
  purchaseCurrency: string;
  paymentMethod: OnrampPaymentMethod;
  phoneNumber: string;
  email: string;
  smsVerificationId: string;
  emailVerificationId: string;
  /** ISO timestamp of when the phone OTP was accepted. */
  phoneNumberVerifiedAt: string;
  /** ISO timestamp of when the user accepted Coinbase's terms. */
  agreementAcceptedAt: string;
}

export interface OnrampOrderFee {
  type: string;
  amount: string;
  currency: string;
}

export interface OnrampOrderResponse {
  orderId: string;
  /** Hosted pay-button URL to load in an iframe. */
  paymentUrl: string;
  paymentTotal: string;
  paymentSubtotal: string;
  paymentCurrency: string;
  purchaseAmount: string;
  purchaseCurrency: string;
  fees: OnrampOrderFee[];
}

export interface OnrampErrorResponse {
  error: string;
  errorType?: string;
}

/** Post message events emitted by the hosted pay button. */
export type OnrampEventName =
  | "onramp_api.load_pending"
  | "onramp_api.load_success"
  | "onramp_api.load_error"
  | "onramp_api.commit_success"
  | "onramp_api.commit_error"
  | "onramp_api.cancel"
  | "onramp_api.polling_start"
  | "onramp_api.polling_success"
  | "onramp_api.polling_error";

export interface OnrampEvent {
  eventName: OnrampEventName;
  errorCode?: string;
  errorMessage?: string;
}
