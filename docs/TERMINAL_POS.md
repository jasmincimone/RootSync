# In-person POS & Stripe Terminal (M2)

RootSync marketplace and POS use **destination charges** on the **platform** Stripe account, then transfer net proceeds to the vendor’s Connect `acct_…`.

## Vendor self-serve (no platform hand-holding for Counter)

Vendors complete setup from **Account → Vendor → In-person POS**:

1. Get **approved** as a vendor  
2. Finish **Payment Hub** until Stripe shows charges/payouts ready  
3. (Recommended) Publish an **ACTIVE** listing at $0.50+ for the Terminal picker  
4. Use **Counter** on phone/tablet — fully self-serve in the browser  
5. Optional **M2**: install RootSync Terminal, sign in with the same vendor login, scan the reader  

Live checklist: `/account/vendor/pos` (POS setup guide) and vendor dashboard “Getting started”.  
Admin view: **Account → Admin → Vendors** → **POS readiness** (computed live — no DB flag).

### What vendors can do without you
| Path | Self-serve? |
|------|-------------|
| Counter POS (Checkout on phone) | Yes, after Connect is ready |
| Listings / Sync from Stripe | Yes |
| Sales + email/SMS/Share receipts in Terminal app | Yes, once they have the app |
| Install Terminal app | Needs a TestFlight/store link (`NEXT_PUBLIC_TERMINAL_APP_URL`) or you invite them once |
| Buy Stripe Reader M2 | They buy hardware themselves |

Set `NEXT_PUBLIC_TERMINAL_APP_URL` in Vercel to your public TestFlight or App Store URL so the POS setup guide shows **Get RootSync Terminal**.

## What works today

### Counter checkout (phone / tablet — no reader)
1. Vendor → **In-person POS** → **Counter**  
2. Enter amount → **Charge on this device**  
3. Customer pays with card / Apple Pay / Google Pay on that screen  

### Stripe Reader M2
The M2 is Bluetooth-only. Stripe Dashboard cannot run it as a full Connect POS.

Use the companion app:

→ **[`apps/terminal-pos/README.md`](../apps/terminal-pos/README.md)**

Backend endpoints the app uses:
- `POST /api/vendor/pos/mobile-login`
- `POST /api/vendor/pos/connection-token` (Bearer or web session)
- `GET /api/vendor/pos/readiness` — onboarding checklist state  
- `GET /api/vendor/pos/listings` — ACTIVE listings/variants (live from Postgres; Refresh in-app)
- `POST /api/vendor/pos/sync-from-stripe` — pull Connect products into RootSync (same as Payment Hub sync)
- `GET /api/vendor/pos/orders` — recent Terminal / counter POS sales  
- `POST /api/vendor/pos/orders/[id]/receipt` — email or SMS (`channel: email|sms`)  
- `POST /api/vendor/pos/terminal-intent` — custom `amountCents` **or** `listingId` + optional `variantId`

Stripe Dashboard **Products** are not the Terminal catalog. Terminal sells **RootSync ACTIVE listings**. Use **Sync from Stripe** (app or Payment Hub) if products were created only in Stripe.

### Sales & receipts (Terminal app)
- **Sales** tab lists recent in-person orders from Postgres.  
- Select a sale → **receipt preview** on screen.  
- **Share / Print** opens the system share sheet (AirPrint / Phomemo / Messages / Mail).  
- **Email** via Resend; **SMS** via Twilio.  
- After a successful charge, the app jumps to Sales with that order selected.

Optional env:
- `STRIPE_TERMINAL_LOCATION_ID=tml_…` (platform Terminal location)
- `NEXT_PUBLIC_TERMINAL_APP_URL` (TestFlight / store install link for vendors)

## Dual Urban Roots Stripe accounts
See [MONEY_OPS_RUNBOOK.md](./MONEY_OPS_RUNBOOK.md) §7.

## Stripe Dashboard checklist (platform)
1. Platform → enable **Terminal**  
2. Create a Location; set `STRIPE_TERMINAL_LOCATION_ID`  
3. Webhook includes `payment_intent.succeeded`  
4. Same test/live mode everywhere  
5. Prefer a RAK with PaymentIntents + Terminal + Connect write; if Stripe says permissions are unavailable for restricted keys, use `sk_live_…` for Terminal intents.
