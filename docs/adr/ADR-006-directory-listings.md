---
adr: 006
title: Directory Listing Model
status: Accepted
date: 2026-07-06
owner: Jasmin Smith
related:
  - ../15_DOMAIN_MODEL.md
  - ../17_GLOSSARY.md
  - ../PRDs/PRD-Directory-Listings.md
  - ADR-001-offering-listing-model.md
---

# ADR-006: Directory Listing Model

## Status

Accepted

## Context

RootSync Discover should surface local businesses that are **not** RootSync Vendors — imported directory data (initially USDA Local Food Directories) — without implying messaging, checkout, or vendor capabilities.

The existing `VendorProfile` → `Offering` → `Listing` stack is commerce-centric (orders, bookings, payments). Directory entries are view-only per the Domain Model and PRD.

## Decision

### 1. Separate `DirectoryListing` table

Directory businesses are **not** Vendors and do not use Offering/Listing.

| Field group | Purpose |
|-------------|---------|
| Identity | `name`, `description`, `directoryType` |
| Location | address, `latitude`/`longitude` |
| Contact | `phone`, `email`, `website` (display only) |
| Import | `source`, `externalId`, `externalUrl`, `rawSourceJson`, `lastSyncedAt` |
| Claim (future) | `claimStatus`, `claimedVendorProfileId` → `VendorProfile` |

`@@unique([source, externalId])` enables idempotent USDA re-sync.

### 2. Polymorphism at Discover UI only

Shared: search, map pins, source filter, design language.

Different:
- `/discover/vendors/[id]` — Verified vendor badge, listings, message, checkout
- `/discover/directory/[id]` — Directory badge, contact/location only, claim CTA (stub)

### 3. USDA import (batch, server-side)

- Sync script `npm run directory:sync` — never call USDA from browse pages
- Primary API: `get_searchresult_list` (location + radius)
- Fallback: per-directory datasharing API with `USDA_LOCAL_FOOD_API_KEY`
- Initial seed: zip `31216` (Macon, GA), radius 30 mi (USDA enum nearest to 20)

### 4. Claim workflow (deferred)

`claimStatus`: `UNCLAIMED` → `PENDING` → `CLAIMED` with optional link to existing `VendorProfile`. No duplicate vendor model.

## Alternatives Considered

**VendorProfile with `type` flag** — Rejected: blurs trust, enables commerce paths on non-vendors.

**Listing type `DIRECTORY`** — Rejected: violates ADR-001; forces fake offerings and order FKs.

## Consequences

- Discover queries union vendors, commerce listings, and directory rows in the UI layer
- Map shows two pin styles (vendor vs directory)
- Production requires periodic sync (cron or manual) for fresh USDA data
