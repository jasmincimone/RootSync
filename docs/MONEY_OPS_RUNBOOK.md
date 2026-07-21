# Money ops runbook

Short checklist when payments, Connect, or Stripe webhooks misbehave.  
For full launch verification see [LAUNCH_SMOKE_CHECKLIST.md](./LAUNCH_SMOKE_CHECKLIST.md).

## Rules of the road

- **PostgreSQL is source of truth** for orders/bookings; Stripe is the payment rail.
- **Never mix** live (`sk_live` / `pk_live`) and test (`sk_test` / `pk_test`) keys or Connect `acct_…` IDs.
- Production: `ENABLE_CONNECT_DEMO` must be **unset**.
- Default platform fee is **10%** (`STRIPE_PLATFORM_FEE_BPS=1000` if unset).

## 1. Webhook not marking orders paid

**Symptom:** Member paid in Stripe; order still `pending` in RootSync; confirmation page empty.

1. Stripe Dashboard → **Developers → Webhooks** → endpoint `…/api/webhooks/stripe`.  
2. Confirm recent `checkout.session.completed` deliveries (200). Open a failed delivery and **Resend**.  
3. Vercel env: `STRIPE_WEBHOOK_SECRET` matches **this** endpoint’s signing secret (live vs test).  
4. Local:  
   `stripe listen --forward-to localhost:3001/api/webhooks/stripe`  
   and put the CLI `whsec_…` in `.env.local`.  
5. In DB, confirm `Order.stripeSessionId` / `status`. Metadata on the Checkout Session must include `orderId` (and `type=service_booking` + `bookingId` for bookings).

Signature failures return **400** — fix the secret; don’t “force” paid in production without a Stripe payment proof.

## 2. Vendor can’t get paid / Buy now blocked

**Symptom:** Honest UI: vendor not ready for card payments; or Connect onboarding loops.

1. Vendor → **Account → Vendor → Payment Hub** — finish Stripe onboarding until charges can be enabled.  
2. Confirm `User.stripeConnectAccountId` is an `acct_…` from the **same** mode (test/live) as your keys.  
3. If a stale/wrong account ID is stuck: clear mapping in admin/dev tools only after verifying mode mismatch; create a fresh Connect account.  
4. Optional: vendor may still sell via an **external payment link** (no RootSync fee) — that path is separate from Connect Checkout.

## 3. Wrong platform fee

1. Check `STRIPE_PLATFORM_FEE_BPS` in Vercel (1000 = 10%).  
2. In Stripe payment details, **Application fee** should be ~fee% of charge; card processing fees are separate and go to Stripe.  
3. Unit coverage: `src/lib/platformFee.test.ts`, `src/lib/stripeCheckoutWebhook.test.ts`.

## 4. Cancel booking / refund

1. Prefer in-app cancel when available (Member or Vendor booking UIs).  
2. Code path uses Stripe refund with **reverse_transfer** (+ refund application fee when Connect).  
3. If refund fails: Stripe Dashboard → Payment → Refund; then align RootSync booking/order status manually only with a written note of the Stripe refund ID.  
4. Deeper booking notes: [19_SERVICE_BOOKINGS.md](./19_SERVICE_BOOKINGS.md).

## 5. Resource download issues

1. Buyer must be signed in; file is gated by **order ownership** (`/api/download`).  
2. Anonymous → 401. Wrong member → denied.  
3. Confirm listing had a delivery file before publish, order status `paid`, and Blob token set in that environment.  
4. **Free Resources ($0):** no Stripe — Members claim via `/api/marketplace/listings/[id]/claim-free`, which creates a $0 `paid` order, then the same download gate applies. Connect is not required for free Resources.

## 6. Preview / staging vs production

**Do this before scaling:** Preview must not share Production Stripe live keys or the production database.

| Environment | Stripe | Database |
|-------------|--------|----------|
| Local / Preview | Test keys | Dev or Neon branch |
| Production | Live keys | Production Neon |

See also [13_DEPLOYMENT.md](./13_DEPLOYMENT.md).

## Who to ping

- Product/ops: confirm Member email, approximate time, listing/vendor name.  
- Engineering: Stripe event ID, Checkout Session ID, Order/Booking ID, Vercel deployment URL.
