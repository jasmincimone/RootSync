import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe";

/**
 * Extracts `acct_...` from pasted dashboard URLs or trims accidental quotes/whitespace.
 */
export function normalizeStripeConnectAccountId(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  const fromUrl = s.match(/acct_[a-zA-Z0-9]+/);
  if (fromUrl) return fromUrl[0];
  return s;
}

export function stripeConnectErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "type" in err && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error.";
}

/** Actionable hint when Stripe returns 403 on Connect account APIs. */
export function stripeConnectForbiddenHint(err: unknown): string {
  const msg = stripeConnectErrorMessage(err).toLowerCase();
  const usingRestricted =
    typeof process.env.STRIPE_SECRET_KEY === "string" &&
    process.env.STRIPE_SECRET_KEY.startsWith("rk_");

  if (usingRestricted) {
    return (
      "Your STRIPE_SECRET_KEY looks like a restricted key (rk_…). In Stripe Dashboard → " +
      "Developers → API keys → edit this key → enable Connect → Accounts (Read and Write). " +
      "Then restart the dev server. Until then, use a full secret key (sk_…) for Connect setup."
    );
  }
  if (msg.includes("does not have permission to access account")) {
    return (
      "This acct_… id is not a connected account under your platform — often it is your main " +
      "Stripe business account, an account from another platform, or test/live mismatch. " +
      'Use "Create Stripe account" here instead of pasting your platform account id.'
    );
  }
  return (
    "Confirm STRIPE_SECRET_KEY is for the same Stripe platform (test vs live) where the account " +
    "was created, and that this is a Connect connected account from RootSync — not your platform account."
  );
}

/**
 * Demo-only defaults.
 * Replace these values in your own implementation once you wire real config.
 */
const DEFAULT_COUNTRY = "us";
const DEFAULT_CURRENCY = "usd";
const DEFAULT_APPLICATION_FEE_CENTS = 123;

export type ConnectAccountStatus = {
  accountId: string;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string;
  cardPaymentsStatus: string;
  payoutsStatus: string;
};

/**
 * Returns a Stripe client for all Stripe requests in this Connect sample.
 */
export function getConnectStripeClient() {
  return getStripeClient();
}

/**
 * Throws a clear error for required environment variables.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add ${name}=... to .env.local (placeholder) and restart the dev server.`
    );
  }
  return value;
}

const trimTrailingSlash = (u: string) => u.replace(/\/$/, "");

/**
 * Public base URL for Connect return/refresh links, Checkout success/cancel, etc.
 * On localhost / 127.0.0.1, prefer the **request** origin so `NEXTAUTH_URL` (often
 * `http://localhost:3000`) does not send Stripe the wrong port when you use `dev:3001`.
 */
export function appBaseUrl(originFromRequest?: string): string {
  if (originFromRequest) {
    try {
      const req = new URL(originFromRequest);
      const h = req.hostname.toLowerCase();
      if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
        return trimTrailingSlash(originFromRequest);
      }
    } catch {
      /* ignore */
    }
  }
  if (process.env.NEXTAUTH_URL) return trimTrailingSlash(process.env.NEXTAUTH_URL);
  if (originFromRequest) return trimTrailingSlash(originFromRequest);
  return "http://localhost:3000";
}

export async function fetchConnectAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
  const stripeClient = getConnectStripeClient();
  // Always fetch live status from Accounts v2 (do not trust a DB cache for this demo).
  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.merchant", "requirements"],
  });

  const cardPaymentsStatus =
    account?.configuration?.merchant?.capabilities?.card_payments?.status || "unknown";
  const payoutsStatus =
    (
      account?.configuration?.merchant?.capabilities?.stripe_balance as unknown as { status?: string } | undefined
    )?.status || "unknown";
  // requirements.summary.minimum_deadline.status — currently_due / past_due means more info needed.
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status || "unknown";
  const onboardingComplete = requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";
  const readyToProcessPayments = cardPaymentsStatus === "active";

  return {
    accountId,
    readyToProcessPayments,
    onboardingComplete,
    requirementsStatus,
    cardPaymentsStatus,
    payoutsStatus,
  };
}

export function coercePriceCents(raw: unknown): number {
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("priceInCents must be a positive integer.");
  }
  return Math.round(parsed);
}

export function getDefaultCurrency(raw?: string): string {
  return (raw || DEFAULT_CURRENCY).toLowerCase();
}

export function getApplicationFeeCents(raw?: unknown): number {
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return DEFAULT_APPLICATION_FEE_CENTS;
}

export function getDefaultCountry() {
  return DEFAULT_COUNTRY;
}

export function toDateOrNull(unixSeconds?: number | null): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

export function isSubscriptionEventType(type: string): boolean {
  return (
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted" ||
    type === "payment_method.attached" ||
    type === "payment_method.detached" ||
    type === "customer.updated" ||
    type === "customer.tax_id.created" ||
    type === "customer.tax_id.updated" ||
    type === "customer.tax_id.deleted" ||
    type === "billing_portal.configuration.created" ||
    type === "billing_portal.configuration.updated" ||
    type === "billing_portal.session.created"
  );
}

export function hasStripeSig(headers: Headers): string | null {
  return headers.get("stripe-signature");
}

export type ThinEventLike = {
  id: string;
  type: string;
};

/**
 * Stripe thin-event helpers in SDKs are evolving. This helper keeps the sample
 * explicit and resilient while still following Stripe's thin event guidance.
 */
export function parseThinEventOrThrow(args: {
  stripeClient: Stripe;
  body: string;
  signature: string;
  webhookSecret: string;
}): ThinEventLike {
  const anyClient = args.stripeClient as unknown as {
    parseThinEvent?: (body: string, signature: string, secret: string) => ThinEventLike;
  };
  if (!anyClient.parseThinEvent) {
    throw new Error(
      "stripeClient.parseThinEvent is unavailable in this SDK/runtime. Update Stripe SDK and verify thin-event parsing support."
    );
  }
  return anyClient.parseThinEvent(args.body, args.signature, args.webhookSecret);
}
