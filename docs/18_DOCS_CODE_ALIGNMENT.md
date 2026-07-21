---
title: Documentation ↔ Code Alignment
version: 1.0
status: Active
owner: Jasmin Smith
last_updated: 2026-06-29
related:
  - ROOTSYNC_CONSTITUTION.md
  - 15_DOMAIN_MODEL.md
  - 17_GLOSSARY.md
  - 16_ENGINEERING_HANDBOOK.md
  - 10_FEATURE_ROADMAP.md
---

# Documentation ↔ Code Alignment

## Purpose

This document maps **what RootSync docs describe** to **what the codebase implements today**.

Use it when:

- Planning a feature (find gaps before coding)
- Renaming or refactoring (terminology + schema)
- Resolving doc/code conflicts (Documentation-Driven Development)
- Prioritizing Phase 2+ work

**Authority order when docs and code disagree:**

1. [ROOTSYNC_CONSTITUTION.md](./ROOTSYNC_CONSTITUTION.md)
2. [15_DOMAIN_MODEL.md](./15_DOMAIN_MODEL.md) + [17_GLOSSARY.md](./17_GLOSSARY.md)
3. Relevant PRD
4. This alignment doc (snapshot of reality)
5. Code (until an ADR updates the domain model)

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **Aligned** | Code matches docs in spirit and naming |
| **Partial** | Core behavior exists; model, UX, or naming incomplete |
| **Gap** | Documented but not built |
| **Legacy** | Code exists; docs say deprecate or replace |
| **Deferred** | Roadmap Phase 2+; intentionally not started |

---

## Executive Summary

| Area | Doc target | Code today | Status |
|------|------------|------------|--------|
| Platform identity | RootSync local-living platform | RootSync branding live; Fix Collective parent in legal copy | **Partial** |
| User types | Visitor, Member, Vendor, Administrator | `User` + `CUSTOMER`/`VENDOR`/`ADMIN` roles | **Partial** |
| Marketplace model | Offering → Listing → Product/Service/Resource/Event | `Offering` + `Listing` + type details and live UX (ADR-001) | **Aligned** (MVP) |
| Verified vendors | Admin verification + trust indicators | APPROVED gate + reusable badge/explainer | **Aligned** |
| Discover | Unified discovery (vendors, listings, directory, map, search) | `/discover` with search, filters, map, favorites, spotlights | **Aligned** (MVP) |
| Directory listings | Imported businesses with assisted claim path | USDA model/import, Discover detail/map, claim request + admin review | **Aligned** (MVP) |
| Commerce | Stripe Connect + Checkout + Booking | Marketplace Buy Now + service booking engine | **Partial** — refunds on cancel live |
| Resources (digital) | Listing type Resource | Private Blob upload, paid-order ownership gate, secure delivery | **Aligned** (MVP) |
| Services / Consultations | Service type + booking | Full flow: slots, Checkout, Meet, cancel, refund | **Aligned** (MVP) |
| Events | Listing type Event (classes/workshops) | Attendance modes, ticket tiers, checkout, confirmation + join email | **Aligned** (MVP) |
| Community | Member discussions | `CommunityPost` live; UI branded **Pulse** | **Partial** — rename complete in nav; table deferred |
| Pulse (platform service) | Contribution ledger + Individual + Platform Pulse | Phase 1–2 shipped; v2 spec documented | **Partial** — see [22_PULSE_SYSTEM.md](./22_PULSE_SYSTEM.md) |
| Messaging | Member ↔ Member / Vendor | `DirectThread` / `DirectMessage`; UI **Stay Synced** | **Aligned** |
| AI | RootSense AI + Rootie | `/rootsense-ai` live; legacy redirects retained | **Aligned** |
| Favorites | Save Listing, Vendor, or Directory Listing | `Favorite`, `/account/saved`, Discover section + detail controls | **Aligned** |
| Follow | Receive Member/Vendor updates | Not implemented | **Deferred** |
| Pulse reviews | Legitimate post-interaction trust signal | Order/booking eligibility + Vendor Pulse review UI | **Partial** |
| GrowSpace | Vendor growth workspace | Overview + CRM + Funnels + Campaigns live; later modules hidden | **Partial** (Phase 1) |
| Legacy platform shops | Vendor profile IS the shop | Redirects live; `ShopPage` + admin shops + `/products/` remain | **Legacy** |
| Governance | RFC → PRD → ADR → Changelog | PRDs and ADR-001–008 exist; changelog discipline remains partial | **Partial** |

**App version:** `package.json` → `0.1.0` (pre-1.0 rapid iteration per [VERSIONING.md](./governance/VERSIONING.md)).

---

## Domain Model ↔ Database

### Identity & roles

| Doc entity | Glossary / domain | Code artifact | Status | Notes |
|------------|-------------------|---------------|--------|-------|
| Visitor | Unauthenticated browser | No DB row; public routes | **Aligned** | Purchase/message gated by auth |
| Member | Registered account | `User` model, role `CUSTOMER` | **Partial** | Rename to Member in UI/docs-over-code path; keep `User` table until ADR |
| Vendor | Verified member who sells | `VendorProfile` + `User.role` VENDOR | **Partial** | Approval via `VendorProfile.status`; role and profile can diverge |
| Administrator | Platform moderator | `User.role` ADMIN | **Aligned** | Admin vendor approval, users, legacy shop catalog |
| Verified Vendor | Completed verification | `VendorProfile.status === APPROVED` | **Aligned** | Badge and RootSync review explainer on Discover |

**Offering states:** Draft, Scheduled, Active, Paused, Archived.  
**Listing visibility:** Public or Hidden. Offering is the internal lifecycle source of truth.

### Marketplace entities

| Doc entity | Code artifact | Status | Notes |
|------------|---------------|--------|-------|
| Offering | `Offering` model | **Aligned** | Status: DRAFT/SCHEDULED/ACTIVE/PAUSED/ARCHIVED |
| Listing | `Listing` model (public) | **Aligned** | 1:1 with Offering; `visibility` PUBLIC/HIDDEN |
| Product | `ProductDetails` + `listingType PRODUCT` | **Partial** | Default for migrated + new offerings |
| Service | `ServiceDetails` + booking engine | **Aligned** | See [19_SERVICE_BOOKINGS.md](./19_SERVICE_BOOKINGS.md), ADR-005 |
| Resource | `ResourceDetails` + vendor form + paid/free download gate | **Aligned** (MVP) | Publishing requires a delivery file; $0 uses claim-free (no Stripe) |
| Event | `EventDetails` + ticket tiers + fulfillment | **Aligned** (MVP) | In-person, Meet, and external event-space modes |
| Directory Listing | `DirectoryListing` | **Aligned** (MVP) | USDA import, map/search, request + admin-assisted claim |

### Commerce & orders

| Doc concept | Code artifact | Status | Notes |
|-------------|---------------|--------|-------|
| Checkout | `marketplaceCheckout.ts`, `/api/marketplace/listings/[id]/checkout` | **Partial** | Marketplace listings; destination charge when Connect ready |
| Checkout (legacy) | Cart + `/api/checkout-session`, `ShopCatalogListing` | **Legacy** | Platform shop catalog path |
| Stripe Connect | `User.stripeConnectAccountId`, Payment Hub + Connect APIs | **Aligned** (MVP) | Vendor Payment Hub owns onboarding |
| Booking | `Booking`, `ServiceAvailabilityRule`, `BookingIntakeAnswer` | **Aligned** | Cancel + full refund; calendar + Meet |
| Order | `Order`, `OrderItem` | **Aligned** | Supports marketplace + service bookings; `refunded` status |

### Community, Pulse & messaging

| Doc concept | Code artifact | Status |
|-------------|---------------|--------|
| Pulse (feed) | `CommunityPost`, `/pulse` | **Partial** — UI branded; table rename deferred |
| Pulse Events | `PulseEvent`, `pulse_score_weights` | **Partial** — hooks + backfill live; v2 tiers pending |
| Individual Pulse | `PulseScore`, `PulseMeter` | **Partial** — 3 tiers in code; 6 tiers in spec |
| Platform Pulse | `PlatformPulseDaily`, `PublicPulseDashboard` | **Partial** — sum-based v1; weighted index pending |
| Give a Pulse | `PulseReaction`, `GivePulseButton` | **Aligned** |
| Stay Synced | `DirectThread`, `DirectMessage` | **Aligned** |
| Pulse earned toast | `PulseToastProvider`, `PulseEarnedToast` | **Aligned** |
| Vendor Pulse reviews | `VendorPulseReview`, eligibility + review form | **Partial** |
| Follow | — | **Gap** |
| Favorite | `Favorite`, API, detail controls, account + Discover surfaces | **Aligned** |
| Review (stars) | Replaced by Pulse reviews | **Aligned** in terminology |

### Legacy / parallel systems (technical debt)

| System | Tables / routes | Doc intent | Status |
|--------|-----------------|------------|--------|
| Platform shop landing | `ShopPage`, admin `/account/admin/shops` | Vendor profile is storefront | **Legacy** |
| Platform shop catalog | `ShopCatalogListing`, `/products/[id]`, cart | Unified vendor listings | **Legacy** |
| Legacy URL slugs | `VendorProfile.shopSlug`, `/shops/[slug]` → vendor Discover path (not blanket `/discover`) | Keep redirects; assign `shopSlug` for Survival Kits; retire duplicate admin | **Aligned** (2026-07-17: config no longer swallows per-slug routes) |
| Vendor carousel | `VendorProfile.mediaCarouselJson` | On vendor profile | **Aligned** |

---

## Terminology Alignment

Per [17_GLOSSARY.md](./17_GLOSSARY.md) deprecated terms:

| Deprecated (code/UI today) | Preferred | Where it appears | Priority |
|----------------------------|-----------|------------------|----------|
| User | Member | Prisma `User`, APIs ("User not found"), legal "User Accounts" | P1 — UI + API messages first; schema later (ADR) |
| Seller | Vendor | `/seller-terms`, listing detail "Seller", footer | P1 — copy + routes redirect |
| Download(s) | Resource | Legacy order type `digital`; redirects from `/downloads` | **Partial** — prefer "resource" in new orders |
| Marketplace Item | Listing | Mostly already "listing" in marketplace UI | **Aligned** |
| Consultation (feature) | Service → Consultation | PRD title only | P2 — when booking ships |
| Farmer marketplace | Vendor Marketplace | Fixed in marketplace title | **Aligned** |
| CUSTOMER role | Member (concept) | `roles.ts` | P2 — consider `MEMBER` enum via migration + ADR |

**Doc inconsistencies to fix (not code):**

| Doc | Issue |
|-----|-------|
| [09_USER_ROLES.md](./09_USER_ROLES.md) | Still says "User" not Member |
| [05_DATABASE_SCHEMA.md](./05_DATABASE_SCHEMA.md) | High-level list; predates Domain Model |
| [docs/README.md](./README.md) | Missing Constitution, Domain Model, Glossary, this doc |

---

## Feature Areas vs Roadmap

### Phase 1 (roadmap) — current build

| Feature | Doc | Code | Status |
|---------|-----|------|--------|
| Discover Marketplace | ✓ | `/discover`, Vendor/Listing/Directory details | **Aligned** (MVP) |
| Vendor profiles | ✓ | `/discover/vendors/[id]`, apply, admin approve | **Aligned** |
| Pulse | ✓ | `/pulse`, Your Pulse, Give a Pulse | **Aligned** (MVP) |
| RootSense AI | ✓ | Rootie chat | **Aligned** |
| Stay Synced | ✓ | Inbox, Vendor/Member conversations | **Aligned** |
| Maps | ✓ | Leaflet Vendor + Directory pins | **Aligned** (MVP) |

### Phase 2 / growth capabilities

| Feature | PRD | Code | Status |
|---------|-----|------|--------|
| Directory Listings | [PRD-Directory-Listings.md](./PRDs/PRD-Directory-Listings.md) | Browse, map, favorites, assisted claim | **Aligned** (MVP) |
| Marketing Funnel | [PRD-Marketing-Funnel.md](./PRDs/PRD-Marketing-Funnel.md) | GrowSpace CRM, Funnels, Campaigns | **Partial** (Phase 1) |
| Consultations | [PRD-Consultation-Booking.md](./PRDs/PRD-Consultation-Booking.md) | Service booking engine | **Aligned** (as Service subtype) |

### Phase 3 (roadmap)

Reviews, Analytics, Referrals, Native Apps — **Deferred**. Events and Resources ship as Discover listing types (no separate `/courses` or `/downloads` hubs).

---

## Routes & UX ↔ Product Concepts

| Doc concept | Expected UX | Current route / component | Status |
|-------------|-------------|---------------------------|--------|
| Discover | Primary discovery hub | `/discover` | **Aligned** |
| Vendors | Browse verified vendors | `/discover`, Vendor cards/spotlights/map | **Aligned** |
| Listings | Browse all listing types | `/discover`, `/discover/listings/[id]` | **Aligned** (MVP) |
| Directory Listings | Map + search + assisted claim | `/discover/directory/[id]` | **Aligned** (MVP) |
| Storefront | Vendor-managed public page | `/discover/vendors/[id]` | **Aligned** |
| Resources | Discover filter + paid/free order access | `/discover?type=RESOURCE`, claim-free + `/api/download` | **Aligned** (MVP) |
| Booking | Service scheduling | `/discover/listings/[id]/book` | **Aligned** (MVP) |
| Connect onboarding | Vendor payouts | `/account/vendor/payments` | **Aligned** (MVP) |

---

## Documentation-Driven Development — Process Gaps

| Handbook expectation | Repo state | Action |
|----------------------|------------|--------|
| PRD before feature | PRDs exist for Phase 2; Phase 1 built pre-PRD template | Backfill PRDs for marketplace pivot or write ADR |
| ADR for core model changes | ADR-001–008 exist | Continue ADR discipline; ADR-002 legacy catalog retirement remains |
| Changelog per release | [CHANGELOG.md](./CHANGELOG.md) stops at 1.0.0 narrative | Align with git tags (v0.1.33+) |
| MASTER_CURSOR_PROMPT | [prompts/README.md](./prompts/README.md) references missing file | Upload prompt library |
| Definition of Done | Not tracked per feature historically | Use for next prioritized item below |

---

## Prioritized Alignment Backlog

Work in this order unless a release forces otherwise. Each item should update docs **before or with** code (Documentation-Driven Development).

### P0 — Foundation (unblocks everything else)

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 1 | ~~**ADR-001: Listing model**~~ | [ADR-001](./adr/ADR-001-offering-listing-model.md) | **Done (0.2.0)** — Offering + Listing + detail tables |
| 2 | **ADR-002: Legacy shop catalog** | `ShopCatalogListing`, cart, `/products/` | Migration plan: fold catalog into vendor listings or keep as admin-only import path |
| 3 | **Stripe Connect in vendor flow** | `/account/vendor`, onboarding APIs | Vendors get payouts without `/connect-demo` |
| 4 | **Update stale docs** | `09_USER_ROLES`, `05_DATABASE_SCHEMA`, `README` | Docs match Domain Model + Glossary |

### P1 — Terminology & trust (visible, low risk)

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 5 | **Member in UI** | Account, community, errors | Glossary-compliant copy; keep `User` in DB |
| 6 | **Seller → Vendor in UI/legal** | `seller-terms`, listing labels, footer | Consistent vendor language |
| 7 | ~~**Verified vendor badge**~~ | Discover cards, vendor hero | **Done** — visual trust + review explainer |
| 8 | **Changelog discipline** | `CHANGELOG.md`, release process | Entries for v0.1.33+ marketplace pivot |

### P2 — Domain completion (Phase 2 enablers)

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 9 | ~~**Listing types**~~ | Schema, vendor forms, Discover filters | **Done** — Product / Service / Resource / Event |
| 10 | ~~**Directory Listings**~~ | Model, map, PRD, claim request | **Done (MVP)** |
| 11 | ~~**Resources**~~ | Private Blob upload + paid download gate | **Done (MVP)** |
| 12 | ~~**Consultation as Service**~~ | Booking PRD, Stripe, calendar | **Done (MVP)** |
| 13 | ~~**Discover experience**~~ | `/discover` | **Done (MVP)** — unified search, filters, map, favorites |

### P3 — Retire legacy & Phase 3

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 14 | **Remove admin platform shops** | `ShopPage`, admin shops UI | Single vendor storefront model |
| 15 | **Cart vs Buy Now** | Checkout paths | One checkout pattern per listing type |
| 16 | **Follow** | New relationship model | Favorites and Pulse reviews shipped; Follow deferred |
| 17 | **Rename `User` → `Member` in schema** | Prisma, auth, migrations | Only after ADR + P1 UI stable |

---

## Suggested ADR Titles (not yet written)

1. ~~**ADR-001: Offering and Listing lifecycle**~~ — Accepted. See [ADR-001](./adr/ADR-001-offering-listing-model.md).
2. **ADR-002: Deprecation of ShopPage and ShopCatalogListing** — Timeline; Urban Roots / Amara kit migration.
3. **ADR-003: Member terminology** — UI/API rename scope; whether `CUSTOMER` becomes `MEMBER`.
4. ~~**ADR-004: Offering variants**~~ — Accepted.
5. ~~**ADR-005: Service bookings**~~ — Accepted.
6. ~~**ADR-006: Directory listings**~~ — Accepted.
7. ~~**ADR-007: Growth workspace**~~ — Accepted.
8. ~~**ADR-008: Pulse system**~~ — Accepted.

---

## Quick Reference: Key Code Locations

| Concern | Location |
|---------|----------|
| Auth / session | `src/lib/authOptions.ts`, `src/lib/sessionUser.ts` |
| Roles & listing status | `src/lib/roles.ts` |
| Vendor access | `src/lib/shopPageAccess.ts`, `src/lib/vendorListingAccess.ts` |
| Marketplace checkout | `src/lib/marketplaceCheckout.ts` |
| Legacy catalog | `src/lib/shopCatalog.ts`, `prisma` `ShopCatalogListing` |
| Legacy shop redirect | `src/lib/vendorShopRedirect.ts`, `src/app/shops/[slug]/page.tsx` |
| Map | `src/components/MarketplaceMap.tsx` |
| Nav labels | `src/config/platformNav.ts` |
| Schema | `prisma/schema.prisma` |
| Offering / Listing helpers | `src/lib/offeringListing.ts`, `src/lib/listingDisplay.ts` |

---

## Maintaining This Document

Update this file when:

- A prioritized backlog item ships
- An ADR changes the domain model
- A PRD moves from Deferred → In Progress → Aligned

**Review cadence:** After each minor release (0.x.y) or before starting a Phase 2 epic.

---

*Snapshot as of 2026-07-17. Updated for Discover, Directory claims, Favorites, Event/Resource fulfillment, Pulse naming, and GrowSpace Phase 1.*
