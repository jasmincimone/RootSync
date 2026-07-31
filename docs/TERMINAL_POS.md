# In-person POS & Stripe Terminal (M2)

RootSync marketplace and POS use **destination charges** on the **platform** Stripe account, then transfer net proceeds to the vendor’s Connect `acct_…`.

## What works today

### Counter checkout (phone / tablet — no reader)
1. Vendor → **In-person POS** → **Counter**  
2. Enter amount → **Charge on this device**  
3. Customer pays with card / Apple Pay / Google Pay on that screen  

### Stripe Reader M2 (you already bought this)
The M2 is Bluetooth-only. Stripe Dashboard cannot run it as a full Connect POS.

Use the companion app:

→ **[`apps/terminal-pos/README.md`](../apps/terminal-pos/README.md)**

Backend endpoints the app uses:
- `POST /api/vendor/pos/mobile-login`
- `POST /api/vendor/pos/connection-token` (Bearer or web session)
- `GET /api/vendor/pos/listings` — ACTIVE listings/variants (live from Postgres; Refresh in-app)
- `POST /api/vendor/pos/sync-from-stripe` — pull Connect products into RootSync (same as Payment Hub sync)
- `POST /api/vendor/pos/terminal-intent` — custom `amountCents` **or** `listingId` + optional `variantId`

Stripe Dashboard **Products** are not the Terminal catalog. Terminal sells **RootSync ACTIVE listings**. Use **Sync from Stripe** (app or Payment Hub) if products were created only in Stripe.

Optional env: `STRIPE_TERMINAL_LOCATION_ID=tml_…` (platform Terminal location).

## Dual Urban Roots Stripe accounts
See [MONEY_OPS_RUNBOOK.md](./MONEY_OPS_RUNBOOK.md) §7.

## Stripe Dashboard checklist
1. Platform → enable **Terminal**  
2. Create a Location; set `STRIPE_TERMINAL_LOCATION_ID`  
3. Webhook includes `payment_intent.succeeded`  
4. Same test/live mode everywhere  
5. **`STRIPE_SECRET_KEY` must be a full secret key (`sk_live_…` / `sk_test_…`), not a restricted key (`rk_…`).** Terminal `card_present` PaymentIntents are not available to restricted keys — Stripe returns a permissions error naming `rk_live_…` / `rk_test_…`.
