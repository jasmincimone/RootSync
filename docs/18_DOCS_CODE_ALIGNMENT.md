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
| Marketplace model | Offering → Listing → Product/Service/Resource/Event | `Offering` + `Listing` + detail tables (ADR-001) | **Partial** — schema live; Service/Resource/Event UX pending |
| Verified vendors | Admin verification + trust indicators | `VendorProfile.status` APPROVED gate | **Partial** |
| Discover | Unified discovery (vendors, listings, directory, map, search) | `/marketplace` + map; no `/discover`; no directory | **Partial** |
| Directory listings | View-only imported businesses; claim later | Not modeled | **Deferred** |
| Commerce | Stripe Connect + Checkout + Booking | Marketplace Buy Now + service booking engine | **Partial** — refunds on cancel live |
| Resources (digital) | Listing type Resource | `/discover?type=RESOURCE`, order items `resource` | **Partial** — listings + download gate; Blob signed URLs pending |
| Services / Consultations | Service type + booking | Full flow: slots, Checkout, Meet, cancel, refund | **Aligned** (MVP) |
| Events | Listing type Event (classes/workshops) | `/discover?type=EVENT`; vendor form + details | **Partial** — RSVP/tickets not built |
| Community | Member discussions | `CommunityPost` live | **Aligned** |
| Messaging | Member ↔ Member / Vendor | `DirectThread` / `DirectMessage` live | **Aligned** |
| AI | RootSync AI assistant | `/rootsync`, `/rootsyncai` live | **Aligned** |
| Favorites / Follow / Reviews | Glossary + Phase 3 roadmap | Not implemented | **Deferred** |
| Legacy platform shops | Vendor profile IS the shop | Redirects live; `ShopPage` + admin shops + `/products/` remain | **Legacy** |
| Governance | RFC → PRD → ADR → Changelog | Docs exist; no ADRs in repo; changelog sparse | **Partial** |

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
| Verified Vendor | Completed verification | `VendorProfile.status === APPROVED` | **Partial** | No distinct "verified" badge beyond approval |

**Offering states (doc):** Draft, Scheduled, Active, Paused, Archived  
**Listing states (code):** `DRAFT`, `PUBLISHED`, `ARCHIVED` on `MarketplaceListing`  
→ No Offering layer; no Scheduled/Paused.

### Marketplace entities

| Doc entity | Code artifact | Status | Notes |
|------------|---------------|--------|-------|
| Offering | `Offering` model | **Aligned** | Status: DRAFT/SCHEDULED/ACTIVE/PAUSED/ARCHIVED |
| Listing | `Listing` model (public) | **Aligned** | 1:1 with Offering; `visibility` PUBLIC/HIDDEN |
| Product | `ProductDetails` + `listingType PRODUCT` | **Partial** | Default for migrated + new offerings |
| Service | `ServiceDetails` + booking engine | **Aligned** | See [19_SERVICE_BOOKINGS.md](./19_SERVICE_BOOKINGS.md), ADR-005 |
| Resource | `ResourceDetails` + vendor form | **Partial** | Secure delivery not built; form + API live |
| Event | `EventDetails` + vendor form | **Partial** | RSVP/tickets not built; form + API live |
| Directory Listing | — | **Gap** | Phase 2 PRD |

### Commerce & orders

| Doc concept | Code artifact | Status | Notes |
|-------------|---------------|--------|-------|
| Checkout | `marketplaceCheckout.ts`, `/api/marketplace/listings/[id]/checkout` | **Partial** | Marketplace listings; destination charge when Connect ready |
| Checkout (legacy) | Cart + `/api/checkout-session`, `ShopCatalogListing` | **Legacy** | Platform shop catalog path |
| Stripe Connect | `User.stripeConnectAccountId`, Connect API routes | **Partial** | Onboarding at `/account/connect-demo`, not main vendor flow |
| Booking | `Booking`, `ServiceAvailabilityRule`, `BookingIntakeAnswer` | **Aligned** | Cancel + full refund; calendar + Meet |
| Order | `Order`, `OrderItem` | **Aligned** | Supports marketplace + service bookings; `refunded` status |

### Community & messaging

| Doc concept | Code artifact | Status |
|-------------|---------------|--------|
| Community | `CommunityPost` | **Aligned** |
| Message | `DirectThread`, `DirectMessage` | **Aligned** |
| Follow | — | **Gap** |
| Favorite | — | **Gap** |
| Review | — | **Gap** |

### Legacy / parallel systems (technical debt)

| System | Tables / routes | Doc intent | Status |
|--------|-----------------|------------|--------|
| Platform shop landing | `ShopPage`, admin `/account/admin/shops` | Vendor profile is storefront | **Legacy** |
| Platform shop catalog | `ShopCatalogListing`, `/products/[id]`, cart | Unified vendor listings | **Legacy** |
| Legacy URL slugs | `VendorProfile.shopSlug`, `/shops/[slug]` → redirect | Keep redirects; retire duplicate admin | **Partial** |
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
| Marketplace | ✓ | `/marketplace`, vendor profiles, listings | **Partial** — no listing types |
| Vendor profiles | ✓ | `/marketplace/vendors/[id]`, apply, admin approve | **Aligned** |
| Community | ✓ | `/community` | **Aligned** |
| AI | ✓ | RootSync chat | **Aligned** |
| Messaging | ✓ | Inbox, vendor messaging | **Aligned** |
| Maps | ✓ | Leaflet map on marketplace | **Partial** — vendors only, no directory pins |

### Phase 2 (roadmap) — not started or stub only

| Feature | PRD | Code | Status |
|---------|-----|------|--------|
| Directory Listings | [PRD-Directory-Listings.md](./PRDs/PRD-Directory-Listings.md) | — | **Deferred** |
| Marketing Funnel | [PRD-Marketing-Funnel.md](./PRDs/PRD-Marketing-Funnel.md) | — | **Deferred** |
| Consultations | [PRD-Consultation-Booking.md](./PRDs/PRD-Consultation-Booking.md) | Service booking engine | **Aligned** (as Service subtype) |

### Phase 3 (roadmap)

Reviews, Analytics, Referrals, Native Apps — **Deferred**. Events and Resources ship as Discover listing types (no separate `/courses` or `/downloads` hubs).

---

## Routes & UX ↔ Product Concepts

| Doc concept | Expected UX | Current route / component | Status |
|-------------|-------------|---------------------------|--------|
| Discover | Primary discovery hub | `/marketplace` (labeled Vendor Marketplace) | **Partial** — rename/route TBD |
| Vendors | Browse verified vendors | `/marketplace`, vendor cards, map | **Aligned** |
| Listings | Browse all listing types | `/marketplace` listing grid, `/marketplace/listings/[id]` | **Partial** — products only in practice |
| Directory Listings | Map + search, view-only | — | **Gap** |
| Storefront | Vendor-managed public page | `/marketplace/vendors/[id]` | **Aligned** |
| Resources | Discover filter + order access | `/discover?type=RESOURCE`, `/api/download` | **Partial** — secure Blob delivery pending |
| Booking | Service scheduling | — | **Gap** |
| Connect onboarding | Vendor payouts | `/account/connect-demo` | **Partial** — should move into vendor account |

---

## Documentation-Driven Development — Process Gaps

| Handbook expectation | Repo state | Action |
|----------------------|------------|--------|
| PRD before feature | PRDs exist for Phase 2; Phase 1 built pre-PRD template | Backfill PRDs for marketplace pivot or write ADR |
| ADR for core model changes | [ADR_GUIDELINES.md](./governance/ADR_GUIDELINES.md) only; no `docs/adr/` | ADR-001: Offering/Listing model; ADR-002: Retire ShopCatalog |
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
| 7 | **Verified vendor badge** | Marketplace cards, vendor hero | Visual trust per glossary |
| 8 | **Changelog discipline** | `CHANGELOG.md`, release process | Entries for v0.1.33+ marketplace pivot |

### P2 — Domain completion (Phase 2 enablers)

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 9 | **Listing types** | Schema, vendor forms, discover filters | Product / Service / Resource / Event |
| 10 | **Directory Listings** | New model, map, PRD | View-only pins; vendor filter |
| 11 | **Resources** | Secure Blob upload + signed download URLs | Instant fulfillment after `checkout.session.completed` |
| 12 | **Consultation as Service** | Booking PRD, Stripe, calendar | Not a standalone "Consultation" feature |
| 13 | **Discover experience** | Nav, `/discover` or marketplace evolution | Unified search + filters per glossary |

### P3 — Retire legacy & Phase 3

| # | Work | Touches | Outcome |
|---|------|---------|---------|
| 14 | **Remove admin platform shops** | `ShopPage`, admin shops UI | Single vendor storefront model |
| 15 | **Cart vs Buy Now** | Checkout paths | One checkout pattern per listing type |
| 16 | **Reviews, Favorites, Follow** | New models | Phase 3 roadmap |
| 17 | **Rename `User` → `Member` in schema** | Prisma, auth, migrations | Only after ADR + P1 UI stable |

---

## Suggested ADR Titles (not yet written)

1. ~~**ADR-001: Offering and Listing lifecycle**~~ — Accepted. See [ADR-001](./adr/ADR-001-offering-listing-model.md).
2. **ADR-002: Deprecation of ShopPage and ShopCatalogListing** — Timeline; Urban Roots / Amara kit migration.
3. **ADR-003: Member terminology** — UI/API rename scope; whether `CUSTOMER` becomes `MEMBER`.
4. **ADR-004: Discover route and information architecture** — `/discover` vs enhanced `/marketplace`.
5. **ADR-005: Directory Listing data model** — Import source, claim workflow, map integration.

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

*Snapshot as of 2026-06-22. Codebase includes marketplace pivot, vendor carousel, profile images, and marketplace Buy Now (may be ahead of last deployed tag).*
