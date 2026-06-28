---
adr: 001
title: Offering and Listing Model
status: Accepted
date: 2026-06-22
owner: Jasmin Smith
related:
  - ../15_DOMAIN_MODEL.md
  - ../17_GLOSSARY.md
  - ../18_DOCS_CODE_ALIGNMENT.md
release_version: 0.2.0
---

# ADR-001: Offering and Listing Model

## Status

Accepted

## Context

RootSync docs define a marketplace hierarchy where **Vendors manage Offerings** and **Members interact with Listings**. The codebase used a single `MarketplaceListing` table with `DRAFT | PUBLISHED | ARCHIVED` and no listing types (Product, Service, Resource, Event).

We need:

- An internal **Offering** lifecycle: Draft → Scheduled → Active → Paused → Archived
- A public **Listing** per Offering (1:1)
- Four listing types with optional type-specific detail tables
- A migration path that preserves existing public listing URLs and order history

## Decision

### 1. Two-layer model

| Layer | Audience | Purpose |
|-------|----------|---------|
| **Offering** | Vendor (internal) | Planning, scheduling, pricing, notes, workflow status |
| **Listing** | Member / Visitor (public) | Discoverable catalog entry; checkout and browse use `Listing.id` |

Every Offering has exactly one Listing (created together). Vendors edit the Offering; public surfaces read the Listing (synced from Offering on save).

### 2. Offering status

| Status | Meaning | Listing visibility |
|--------|---------|-------------------|
| `DRAFT` | Planning; not public | `HIDDEN` |
| `SCHEDULED` | Ready; publishes at `scheduledPublishAt` | `HIDDEN` until publish |
| `ACTIVE` | Public and available | `PUBLIC` |
| `PAUSED` | Temporarily hidden | `HIDDEN` |
| `ARCHIVED` | No longer offered | `HIDDEN` |

### 3. Listing types

`PRODUCT` · `SERVICE` · `RESOURCE` · `EVENT`

Each Offering has one type. Type-specific fields live in optional 1:1 detail tables:

- **ProductDetails** — shipping, SKU
- **ServiceDetails** — `serviceKind` (CONSULTATION | ONE_TIME | SUBSCRIPTION), duration, radius, terms, booking URL
- **ResourceDetails** — format, file URL
- **EventDetails** — starts/ends, location, venue, capacity

### 4. Listing table (public index)

```
Listing
  id, offeringId, vendorProfileId
  listingType, title, description, priceCents
  category, imageUrl
  visibility (PUBLIC | HIDDEN)
  publishedAt, createdAt, updatedAt
```

Shared commerce fields (`priceCents`, `paymentUrl`, `productUrl`) remain on **Offering**; Listing mirrors fields needed for browse/checkout queries.

### 5. Migration from MarketplaceListing

- `Listing.id` = former `MarketplaceListing.id` (URLs unchanged)
- New `Offering` row per legacy listing
- `PUBLISHED` → `ACTIVE` + `visibility PUBLIC`
- `DRAFT` → `DRAFT` + `HIDDEN`
- `ARCHIVED` → `ARCHIVED` + `HIDDEN`
- Default `listingType` = `PRODUCT` + empty `ProductDetails`
- `OrderItem.listingId` continues to reference `Listing.id`

### 6. Deprecated

- `MarketplaceListing` model (removed after migration)
- `LISTING_STATUS.PUBLISHED` for vendor offerings → use `OFFERING_STATUS.ACTIVE`
- `LISTING_STATUS` retained only for legacy `ShopCatalogListing` until ADR-002

## Alternatives Considered

### A. Single `Listing` table only

Simpler schema but mixes vendor workflow and public discovery; harder to support Scheduled/Paused without overloading `status` + `visibility`.

**Rejected** — conflicts with Domain Model (“Vendors manage Offerings”).

### B. Offering without Listing until publish

Listing created only when status becomes Active.

**Rejected** — complicates 1:1 invariant and order FK stability; prefer always-created pair with visibility gate.

### C. JSON type-specific fields on Offering

One table, flexible payload.

**Rejected** — weaker typing and queryability; detail tables match glossary subtypes and future booking/download flows.

## Consequences

### Positive

- Aligns database with Domain Model and Glossary
- Enables Service/Resource/Event without new top-level entities
- Consultations modeled as `SERVICE` + `serviceKind: CONSULTATION`
- Clear path for scheduled publish job (Phase 2)

### Negative / follow-up

- Vendor UI and APIs must use Offering status vocabulary
- Public queries filter `Listing.visibility = PUBLIC` (and vendor approved)
- `ShopCatalogListing` remains parallel until ADR-002
- Scheduled auto-publish requires a cron/worker (not in this ADR)

## Related

- **PRD:** (backfill) Marketplace / vendor listings
- **Issues:** P0 #1 in `18_DOCS_CODE_ALIGNMENT.md`
- **Release:** 0.2.0

## Example

```
Offering: Monthly Garden Maintenance
  Type: SERVICE
  Status: DRAFT
  Price: $125/month
  vendorNotes: Need photos, service radius, terms

ServiceDetails:
  serviceKind: SUBSCRIPTION
  terms: ...

Listing: (synced, visibility HIDDEN until ACTIVE)
```
