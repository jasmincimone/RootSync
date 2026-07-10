import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { hookOrderVerified } from "@/lib/pulse/hooks";
import {
  fetchConnectAccountStatus,
  getConnectStripeClient,
  hasStripeSig,
  isSubscriptionEventType,
  parseThinEventOrThrow,
  requireEnv,
  toDateOrNull,
} from "@/lib/stripeConnectDemo";
import {
  handleStripeProductWebhookEvent,
  isStripeProductEventType,
} from "@/lib/importStripeProduct";

/**
 * Single webhook endpoint handling:
 * 1) Connect Accounts v2 **thin** events (requirements / capability updates)
 * 2) Standard events: checkout.session.completed, Connect product sync, subscription/billing
 *
 * For Dashboard-created products on connected accounts, enable these events on a
 * Connect webhook destination (events from Connected accounts):
 *   product.created, product.updated, product.deleted, price.created, price.updated
 *
 * Thin events (local CLI example):
 *   stripe listen --thin-events \
 *     'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' \
 *     --forward-thin-to localhost:3001/api/webhooks/stripe
 *
 * Standard Connect products (local):
 *   stripe listen --forward-to localhost:3001/api/webhooks/stripe \
 *     --events product.created,product.updated,product.deleted,price.created,price.updated
 *
 * PLACEHOLDER secrets:
 * - STRIPE_WEBHOOK_SECRET=whsec_... (standard events)
 * - STRIPE_THIN_WEBHOOK_SECRET=whsec_... (optional; falls back to STRIPE_WEBHOOK_SECRET)
 */
export async function POST(request: NextRequest) {
  const stripeClient = getConnectStripeClient();
  const body = await request.text();
  const sig = hasStripeSig(request.headers);

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // ---- 1) Try Connect v2 thin-event parsing first (for account updates) ----
  const thinSecret = process.env.STRIPE_THIN_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  if (thinSecret) {
    try {
      // Parse thin envelope, then retrieve the full event payload.
      const thinEvent = parseThinEventOrThrow({
        stripeClient,
        body,
        signature: sig,
        webhookSecret: thinSecret,
      });

      const fullEvent = await stripeClient.v2.core.events.retrieve(thinEvent.id);
      await handleThinConnectV2Event(
        fullEvent as unknown as { id: string; type: string; data?: { object?: { id?: string } } },
      );
      return NextResponse.json({ received: true, mode: "thin", type: thinEvent.type });
    } catch {
      // Not a thin event (or parse method unavailable) → continue to standard webhook parse.
    }
  }

  // ---- 2) Parse regular webhook events (subscriptions + checkout) ----
  // These do NOT use thin events.
  let event: Stripe.Event;
  try {
    const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
    event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown webhook signature error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleLegacyCheckoutCompleted(event);
  } else if (isStripeProductEventType(event.type)) {
    await handleStripeProductWebhookEvent(event);
  } else if (isSubscriptionEventType(event.type)) {
    await handleSubscriptionAndBillingEvent(event);
  }

  return NextResponse.json({ received: true, mode: "standard", type: event.type });
}

async function handleLegacyCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  const bookingId = session.metadata?.bookingId;
  const checkoutType = session.metadata?.type;

  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      stripeSessionId: session.id,
      stripePaymentIntent:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    },
  });

  await hookOrderVerified(orderId);

  if (checkoutType === "service_booking" && bookingId) {
    const { confirmPaidServiceBookingFromStripeSession } = await import("@/lib/confirmBooking");
    await confirmPaidServiceBookingFromStripeSession(session.id);
  }
}

async function handleSubscriptionAndBillingEvent(event: Stripe.Event) {
  /**
   * V2 account subscriptions expose `customer_account` as the connected account id (`acct_...`).
   * Do not rely on classic `.customer` (cus_…) for this Connect V2 billing path.
   */
  const obj = event.data.object as Stripe.Event.Data.Object & {
    customer_account?: string;
    items?: { data?: Array<{ price?: { id?: string }; quantity?: number }> };
    status?: string;
    current_period_end?: number | null;
    cancel_at_period_end?: boolean;
    pause_collection?: { resumes_at?: number; behavior?: string } | null;
    default_payment_method?: string | null;
  };

  // Non-subscription billing events: log + TODO for richer DB sync.
  if (event.type !== "customer.subscription.updated" && event.type !== "customer.subscription.deleted") {
    console.info("[stripe webhook]", event.type, "received");
    // TODO: Persist payment_method / customer / tax_id / billing_portal updates if needed.
    return;
  }

  const accountId = obj.customer_account;
  if (!accountId?.startsWith("acct_")) {
    console.warn("Subscription event missing customer_account acct id:", event.id, event.type);
    return;
  }

  const priceId = obj.items?.data?.[0]?.price?.id ?? null;
  const quantity = obj.items?.data?.[0]?.quantity ?? null;
  const status = event.type === "customer.subscription.deleted" ? "canceled" : obj.status ?? "unknown";
  const periodEnd = toDateOrNull(obj.current_period_end ?? null);

  console.info("[stripe webhook] subscription", {
    type: event.type,
    accountId,
    status,
    priceId,
    quantity,
    cancelAtPeriodEnd: obj.cancel_at_period_end,
    pauseCollection: obj.pause_collection ?? null,
  });

  // Store subscription state against the mapped user (PostgreSQL source of truth).
  // If no user mapping exists yet, this is a harmless no-op.
  await prisma.user.updateMany({
    where: { stripeConnectAccountId: accountId },
    data: {
      stripeSubscriptionStatus: status,
      stripeSubscriptionPriceId: priceId,
      stripeSubscriptionCurrentPeriodEnd: periodEnd,
    },
  });
}

async function handleThinConnectV2Event(event: {
  id: string;
  type: string;
  data?: { object?: { id?: string } };
}) {
  const accountId = event.data?.object?.id;

  switch (event.type) {
    case "v2.core.account[requirements].updated": {
      console.info("[thin] requirements changed for account", accountId || "(unknown)");
      if (accountId?.startsWith("acct_")) {
        try {
          // Re-fetch live readiness so logs reflect current Stripe state.
          const status = await fetchConnectAccountStatus(accountId);
          console.info("[thin] live onboarding status", status);
          // TODO: notify the account owner in-app/email to revisit Payment Hub onboarding.
        } catch (err) {
          console.warn("[thin] could not refresh account status", err);
        }
      }
      break;
    }
    case "v2.core.account[configuration.merchant].capability_status_updated":
    case "v2.core.account[configuration.customer].capability_status_updated":
    case "v2.core.account[.recipient].capability_status_updated": {
      console.info("[thin] capability status changed for account", accountId || "(unknown)", event.type);
      if (accountId?.startsWith("acct_")) {
        try {
          const status = await fetchConnectAccountStatus(accountId);
          console.info("[thin] live capability snapshot", {
            cardPayments: status.cardPaymentsStatus,
            ready: status.readyToProcessPayments,
          });
          // TODO: cache readiness on User/VendorProfile if you need offline checks.
        } catch (err) {
          console.warn("[thin] could not refresh capability status", err);
        }
      }
      break;
    }
    default:
      console.info("[thin] unhandled v2 event type", event.type);
  }
}
