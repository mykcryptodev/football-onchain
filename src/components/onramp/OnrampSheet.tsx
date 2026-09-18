"use client";

import { Check, Loader2, ShieldCheck } from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHaptics } from "@/hooks/useHaptics";
import { useOnrampContact } from "@/hooks/useOnrampContact";
import {
  isPlausibleEmail,
  normalizeUsPhone,
  ONRAMP_PAY_ORIGIN,
  parseOnrampEvent,
  paymentMethodLabel,
  pickPaymentMethod,
  type SavedOnrampContact,
} from "@/lib/onramp/helpers";
import type {
  OnrampChannel,
  OnrampOrderResponse,
  OnrampPaymentMethod,
  OnrampVerifyStartResponse,
  OnrampVerifySubmitResponse,
} from "@/lib/onramp/types";
import { cn } from "@/lib/utils";

type Step =
  | "contact"
  | "otp-sms"
  | "otp-email"
  | "quote"
  | "processing"
  | "success";

interface OnrampSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  /** Human-unit amount to buy, e.g. "1.000000". */
  purchaseAmount: string;
  purchaseCurrency: "USDC" | "ETH";
  /** Display label for what the user is funding, e.g. "1 USDC entry". */
  purpose: string;
  sandbox?: boolean;
  /** Called once Coinbase confirms funds landed in the wallet. */
  onFunded: () => void;
}

interface PendingVerification {
  verificationId: string;
  destination: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(json.error || "Something went wrong");
  }
  return json;
}

function maskPhone(e164: string): string {
  return `•••• ${e164.slice(-4)}`;
}

function formatUsd(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString([], {
    style: "currency",
    currency: "USD",
  });
}

export function OnrampSheet({
  open,
  onOpenChange,
  walletAddress,
  purchaseAmount,
  purchaseCurrency,
  purpose,
  sandbox = false,
  onFunded,
}: OnrampSheetProps) {
  const {
    contact,
    ready: contactReady,
    save: saveContact,
    clear: clearContact,
  } = useOnrampContact(walletAddress);
  const { notificationOccurred, impactOccurred } = useHaptics();

  const [step, setStep] = useState<Step>("contact");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementAcceptedAt, setAgreementAcceptedAt] = useState<string | null>(
    null,
  );
  const [smsPending, setSmsPending] = useState<PendingVerification | null>(
    null,
  );
  const [emailPending, setEmailPending] = useState<PendingVerification | null>(
    null,
  );
  const [smsResult, setSmsResult] = useState<OnrampVerifySubmitResponse | null>(
    null,
  );
  const [order, setOrder] = useState<OnrampOrderResponse | null>(null);
  const [payButtonReady, setPayButtonReady] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const orderRequestRef = useRef(0);

  const paymentMethod: OnrampPaymentMethod = useMemo(() => {
    if (typeof window === "undefined") return "GUEST_CHECKOUT_APPLE_PAY";
    return pickPaymentMethod({
      userAgent: navigator.userAgent,
      hasApplePaySession: "ApplePaySession" in window,
    });
  }, []);
  const payLabel = paymentMethodLabel(paymentMethod);

  const resetFlow = useCallback(() => {
    setStep("contact");
    setCode("");
    setBusy(false);
    setError(null);
    setSmsPending(null);
    setEmailPending(null);
    setSmsResult(null);
    setOrder(null);
    setPayButtonReady(false);
  }, []);

  const createOrder = useCallback(
    async (details: SavedOnrampContact, acceptedAt: string) => {
      const requestId = ++orderRequestRef.current;
      setBusy(true);
      setError(null);
      setOrder(null);
      setPayButtonReady(false);
      try {
        const created = await postJson<OnrampOrderResponse>(
          "/api/onramp/order",
          {
            destinationAddress: walletAddress,
            purchaseAmount,
            purchaseCurrency,
            paymentMethod,
            phoneNumber: details.phoneNumber,
            email: details.email,
            smsVerificationId: details.smsVerificationId,
            emailVerificationId: details.emailVerificationId,
            phoneNumberVerifiedAt: details.phoneNumberVerifiedAt,
            agreementAcceptedAt: acceptedAt,
          },
        );
        if (requestId !== orderRequestRef.current) return;
        setOrder(created);
        setStep("quote");
      } catch (err) {
        if (requestId !== orderRequestRef.current) return;
        const message =
          err instanceof Error ? err.message : "Couldn't start the purchase";
        // Expired/invalid verification: fall back to collecting details again.
        if (/verif/i.test(message)) {
          clearContact();
          setStep("contact");
        }
        setError(message);
      } finally {
        if (requestId === orderRequestRef.current) setBusy(false);
      }
    },
    [
      clearContact,
      paymentMethod,
      purchaseAmount,
      purchaseCurrency,
      walletAddress,
    ],
  );

  // Opening the sheet: returning users go straight to the pay button.
  useEffect(() => {
    if (!open) return;
    resetFlow();
    if (!contactReady) return;
    if (contact) {
      const acceptedAt = new Date().toISOString();
      setAgreementAcceptedAt(acceptedAt);
      setStep("quote");
      void createOrder(contact, acceptedAt);
    } else {
      setPhone("");
      setEmail("");
    }
    // Only re-run when the sheet opens or saved contact finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contactReady]);

  useEffect(() => {
    if (step === "otp-sms" || step === "otp-email") {
      const t = setTimeout(() => codeInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Post-message events from the hosted pay button.
  useEffect(() => {
    if (!open || !order) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== ONRAMP_PAY_ORIGIN) return;
      const parsed = parseOnrampEvent(event.data);
      if (!parsed) return;
      switch (parsed.eventName) {
        case "onramp_api.load_success":
          setPayButtonReady(true);
          setError(null);
          break;
        case "onramp_api.load_error":
          setPayButtonReady(false);
          setError(
            parsed.errorMessage ||
              `${payLabel} isn't available on this device right now.`,
          );
          break;
        case "onramp_api.commit_success":
        case "onramp_api.polling_start":
          setStep("processing");
          setError(null);
          void impactOccurred("medium").catch(() => {});
          break;
        case "onramp_api.commit_error":
        case "onramp_api.polling_error":
          setStep("quote");
          setError(
            parsed.errorMessage || "The payment didn't go through. Try again.",
          );
          void notificationOccurred("error").catch(() => {});
          break;
        case "onramp_api.polling_success":
          setStep("success");
          void notificationOccurred("success").catch(() => {});
          onFunded();
          break;
        case "onramp_api.cancel":
          setStep("quote");
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [impactOccurred, notificationOccurred, onFunded, open, order, payLabel]);

  // Auto-close shortly after success so the user lands back on Submit picks.
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => onOpenChange(false), 1600);
    return () => clearTimeout(t);
  }, [onOpenChange, step]);

  const startVerification = async (
    channel: OnrampChannel,
    destination: string,
  ) => {
    const result = await postJson<
      OnrampVerifyStartResponse & { destination: string }
    >("/api/onramp/verify/start", { channel, destination });
    return {
      verificationId: result.verificationId,
      destination: result.destination,
    };
  };

  const handleContactSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const e164 = normalizeUsPhone(phone);
    if (!e164) {
      setError("Enter a valid US mobile number");
      return;
    }
    if (!isPlausibleEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const acceptedAt = new Date().toISOString();
      setAgreementAcceptedAt(acceptedAt);
      const [sms, mail] = await Promise.all([
        startVerification("sms", e164),
        startVerification("email", email),
      ]);
      setSmsPending(sms);
      setEmailPending(mail);
      setCode("");
      setStep("otp-sms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send codes");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = useCallback(
    async (digits: string) => {
      const pending = step === "otp-sms" ? smsPending : emailPending;
      if (!pending || digits.length !== 6 || busy) return;
      setBusy(true);
      setError(null);
      try {
        const result = await postJson<OnrampVerifySubmitResponse>(
          "/api/onramp/verify/submit",
          { verificationId: pending.verificationId, otpCode: digits },
        );
        void impactOccurred("light").catch(() => {});
        setCode("");
        if (step === "otp-sms") {
          setSmsResult(result);
          setStep("otp-email");
          return;
        }
        // Both channels verified: persist and create the order.
        if (!smsResult || !smsPending || !emailPending) {
          throw new Error("Phone verification is missing");
        }
        const phoneVerifiedAt = new Date().toISOString();
        const expiresAt = new Date(
          Math.min(
            Date.parse(smsResult.verificationExpiresAt),
            Date.parse(result.verificationExpiresAt),
          ),
        ).toISOString();
        const details: SavedOnrampContact = {
          phoneNumber: smsPending.destination,
          email: emailPending.destination,
          smsVerificationId: smsResult.verificationId,
          emailVerificationId: result.verificationId,
          phoneNumberVerifiedAt: phoneVerifiedAt,
          expiresAt,
        };
        saveContact(details);
        setBusy(false);
        setStep("quote");
        await createOrder(
          details,
          agreementAcceptedAt ?? new Date().toISOString(),
        );
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "That code didn't work");
        setCode("");
        void notificationOccurred("error").catch(() => {});
      }
      setBusy(false);
    },
    [
      agreementAcceptedAt,
      busy,
      createOrder,
      emailPending,
      impactOccurred,
      notificationOccurred,
      saveContact,
      smsPending,
      smsResult,
      step,
    ],
  );

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void submitCode(digits);
  };

  const feeTotal = useMemo(() => {
    if (!order) return null;
    const total = order.fees.reduce((sum, f) => sum + Number(f.amount), 0);
    return Number.isNaN(total) ? null : total;
  }, [order]);

  const otpDestination =
    step === "otp-sms"
      ? smsPending
        ? maskPhone(smsPending.destination)
        : ""
      : (emailPending?.destination ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5 rounded-t-2xl p-6 sm:rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {step === "success"
              ? "You're funded"
              : step === "processing"
                ? "Processing payment"
                : `Pay with ${payLabel}`}
          </DialogTitle>
          <DialogDescription>
            {step === "contact" &&
              `Buy ${purchaseAmount.replace(/\.?0+$/, "")} ${purchaseCurrency} for your ${purpose}. Takes about a minute the first time, instant after that.`}
            {(step === "otp-sms" || step === "otp-email") &&
              `Enter the code we ${step === "otp-sms" ? "texted" : "emailed"} to ${otpDestination}.`}
            {step === "quote" &&
              `${purchaseCurrency} lands in your wallet on Base a few seconds after you pay.`}
            {step === "processing" &&
              "Coinbase is sending your crypto. Keep this open — it's quick."}
            {step === "success" && `Your ${purpose} is ready to submit.`}
          </DialogDescription>
        </DialogHeader>

        {sandbox && step === "contact" && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Sandbox mode: use a phone starting with +1000, an email ending in
            @sandbox.test, and code 000000. No card is charged.
          </p>
        )}

        {step === "contact" && (
          <form className="space-y-4" onSubmit={handleContactSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="onramp-phone">US mobile number</Label>
              <Input
                required
                autoComplete="tel"
                disabled={busy}
                id="onramp-phone"
                inputMode="tel"
                placeholder="(555) 555-5555"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onramp-email">Email</Label>
              <Input
                required
                autoComplete="email"
                disabled={busy}
                id="onramp-email"
                inputMode="email"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={busy} size="lg" type="submit">
              {busy ? (
                <>
                  <Loader2 className="animate-spin" /> Sending codes…
                </>
              ) : (
                "Continue"
              )}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By continuing you agree to Coinbase&apos;s{" "}
              <a
                className="underline"
                href="https://www.coinbase.com/legal/guest-checkout/us"
                rel="noreferrer"
                target="_blank"
              >
                Guest Checkout Terms
              </a>
              ,{" "}
              <a
                className="underline"
                href="https://www.coinbase.com/legal/user_agreement"
                rel="noreferrer"
                target="_blank"
              >
                User Agreement
              </a>{" "}
              and{" "}
              <a
                className="underline"
                href="https://www.coinbase.com/legal/privacy"
                rel="noreferrer"
                target="_blank"
              >
                Privacy Policy
              </a>
              . US residents only.
            </p>
          </form>
        )}

        {(step === "otp-sms" || step === "otp-email") && (
          <div className="space-y-4">
            <Input
              ref={codeInputRef}
              aria-label="6-digit verification code"
              autoComplete="one-time-code"
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
              disabled={busy}
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="••••••"
              value={code}
              onChange={e => handleCodeChange(e.target.value)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {busy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Checking…
                  </>
                ) : step === "otp-sms" ? (
                  "Step 1 of 2 · phone"
                ) : (
                  <>
                    <Check className="size-3.5 text-emerald-500" /> Phone
                    verified · step 2 of 2
                  </>
                )}
              </span>
              <button
                className="underline disabled:opacity-50"
                disabled={busy}
                type="button"
                onClick={() => {
                  resetFlow();
                }}
              >
                Change details
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {(step === "quote" || step === "processing") && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              {order ? (
                <dl className="space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">You receive</dt>
                    <dd className="font-semibold">
                      {Number(order.purchaseAmount).toLocaleString([], {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {order.purchaseCurrency}
                    </dd>
                  </div>
                  {feeTotal !== null && feeTotal > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Coinbase fees</dt>
                      <dd>{formatUsd(feeTotal.toString())}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 text-base">
                    <dt className="font-medium">Total</dt>
                    <dd className="font-bold">
                      {formatUsd(order.paymentTotal)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Getting your
                  quote…
                </div>
              )}
            </div>

            {order && step === "quote" && (
              <div className="relative h-14">
                {!payButtonReady && !error && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/60 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Loading{" "}
                    {payLabel}…
                  </div>
                )}
                <iframe
                  key={order.orderId}
                  allow="payment"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  src={order.paymentUrl}
                  title={`Pay with ${payLabel}`}
                  className={cn(
                    "h-14 w-full rounded-xl border-0 transition-opacity duration-300",
                    payButtonReady ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>
            )}

            {step === "processing" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-4 text-sm font-medium">
                <Loader2 className="size-4 animate-spin" /> Sending{" "}
                {purchaseCurrency} to your wallet…
              </div>
            )}

            {error && (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  className="w-full"
                  disabled={busy}
                  variant="outline"
                  onClick={() => {
                    if (contact && agreementAcceptedAt) {
                      void createOrder(contact, agreementAcceptedAt);
                    } else {
                      resetFlow();
                    }
                  }}
                >
                  Try again
                </Button>
              </div>
            )}

            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Secured by Coinbase · funds
              go straight to your wallet
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 animate-in zoom-in-50 duration-300">
              <Check className="size-7" strokeWidth={3} />
            </div>
            <p className="text-sm text-muted-foreground">
              {purchaseCurrency} is in your wallet.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OnrampSheet;
