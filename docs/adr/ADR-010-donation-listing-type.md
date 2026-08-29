---
adr: 010
title: Donation Listing Type
status: Accepted
date: 2026-08-26
owner: Jasmin Smith
related:
  - ADR-001-offering-listing-model.md
  - ADR-004-offering-variants.md
  - ../15_DOMAIN_MODEL.md
  - ../17_GLOSSARY.md
  - ../18_DOCS_CODE_ALIGNMENT.md
release_version: 0.1.83
---

# ADR-010: Donation Listing Type

## Status

Accepted

## Context

ADR-001 defined four listing types (`PRODUCT`, `SERVICE`, `RESOURCE`, `EVENT`). Vendors also need a public way to collect **voluntary contributions** — supporters choose how much to give, optionally from suggested amounts, with RootSync Stripe Connect checkout or an external payment link.

Donations are not products (no shipping/SKU), not services (no booking), not resources (no download), and not events (no tickets). Stretching `PRODUCT` with a custom-amount flag would blur browse labels, checkout rules, and cart behavior.

We needed a fifth listing type that:

- Reuses Offering → Listing (ADR-001) and optional variants (ADR-004)
- Lets buyers type a custom amount **or** tap a suggested amount
- Supports an optional external donate / payment URL
- Keeps PostgreSQL as the source of truth for amounts charged

## Decision

### 1. Fifth listing type: `DONATION`

Extend ADR-001 listing types to:

`PRODUCT` · `SERVICE` · `RESOURCE` · `EVENT` · `DONATION`

One Offering still has exactly one type. Discover filters and vendor create/edit include Donation.

### 2. `DonationDetails` (1:1 with Offering)

| Field | Purpose |
|-------|---------|
| `allowsCustomAmount` | Default `true`. When `false`, only suggested amounts (variants) are accepted |
| `minAmountCents` | Floor for custom amounts (also clamped to Stripe’s USD minimum, 50¢) |
| `maxAmountCents` | Optional ceiling for custom amounts |
| `thankYouMessage` | Optional copy near the donate control on the public listing |

### 3. Suggested amounts = Offering variants

Reuse `OfferingVariant` (ADR-004) as **suggested amounts** on the Options step (title + price). They are shortcuts, not the only way to give when custom amounts are allowed.

Listing `priceCents` may mirror the lowest suggestion or a vendor-set display “from” price; **checkout amount** is resolved separately (see below).

### 4. Buyer-supplied checkout amount

For `DONATION` only, buy-now / marketplace checkout accepts `amountCents` from the buyer (custom input) or uses the selected variant’s `priceCents`.

Resolution lives in `resolveDonationCheckoutAmountCents` (`src/lib/donationCheckout.ts`):

1. If `amountCents` is provided and custom amounts are allowed → validate min/max → charge that
2. Else use selected variant or listing price if it meets the minimum
3. Otherwise reject with a clear error

Stripe Checkout `unit_amount` and the order line use that resolved amount. Platform Connect fee rules are **unchanged** for v1 (same path as other Connect listings).

### 5. External link

Optional `paymentUrl` / `productUrl` on Offering (Checkout step) remains available. When RootSync Stripe is not ready, the listing can still send supporters to an external donate link — same pattern as other listing types.

### 6. Browse / cart

- Discover CTA / labels: **Donate**, “From $X” / “Choose an amount”
- Donations are **excluded from cart** (buy-now / external only)
- No tips-on-top-of-other-products in v1

### 7. Public listing UX

Custom amount input is primary (above suggested chips when both exist). Owner preview of a non-public listing still shows the buyer checkout panel so vendors can verify the donate UI.

## Alternatives Considered

### A. `PRODUCT` + `allowsCustomAmount` flag

Fewer enums, but Discover, cart, shipping, and inventory semantics do not fit donations. Vendors would see product language for a contribution.

**Rejected** — type pollution; harder long-term rules.

### B. Separate “Campaigns / Tips” product outside Offerings

Would duplicate Offering → Listing, images, publish lifecycle, and Connect checkout.

**Rejected** — violates reuse of ADR-001.

### C. Fixed-price donation only (no custom amount)

Simpler checkout, but the product requirement was typed amounts plus optional suggestions.

**Rejected** for primary UX; vendors can still disable custom amounts via `allowsCustomAmount`.

## Consequences

### Positive

- Clear fifth type aligned with Domain Model language
- Variants reused for suggestions; no new pricing table
- Buyer amount validated server-side before Stripe session creation

### Negative / follow-ups

- ADR-001’s “four types” wording is superseded by this ADR for the type set
- Cart and tip-on-product remain out of scope until a later ADR/PRD
- Special platform fee treatment for donations (e.g. lower fee) is **not** decided here

### Docs / schema

- Prisma: `ListingType.DONATION`, `DonationDetails`, migration `20260825210000_donation_listing_type`
- Order item type includes `DONATION` where commerce enums list listing-derived item kinds

## Related

- [ADR-001](./ADR-001-offering-listing-model.md) — Offering / Listing model (extended)
- [ADR-004](./ADR-004-offering-variants.md) — variants as suggested amounts
- Domain Model & Glossary — Donation listing type
