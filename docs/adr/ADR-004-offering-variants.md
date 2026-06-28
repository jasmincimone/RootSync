---
adr: 004
title: Offering Variants (priced options)
status: Accepted
date: 2026-06-28
owner: Jasmin Smith
related:
  - ADR-001-offering-listing-model.md
  - ADR-003-calendar-abstraction.md
---

# ADR-004: Offering Variants

## Decision

One **Offering** may have multiple **OfferingVariant** rows — each with its own title, price, and type-specific fields (duration for services, SKU for products). Shared fields (description, image, availability, intake) stay on the Offering.

Example: *Gardening Consultation* offering with:

| Variant | Price | Duration |
|---------|-------|----------|
| Seed Session | $50 | 30 min |
| Garden Blueprint | $100 | 60 min |
| Urban Roots Design | $150 | 90 min |

`Listing.priceCents` mirrors the **lowest** variant price for browse cards ("From $50").

## Checkout & booking

- Members select a variant on the listing page before Buy / Book
- `variantId` stored on `OrderItem` and `Booking`
- Service slots use the selected variant's `durationMinutes`

## Backward compatibility

Offerings without variants behave exactly as before (single price on Offering).
