---
title: Growth Workspace — Database Schema
version: 1.0
status: Active
owner: Jasmin Smith
last_updated: 2026-07-08
related:
  - adr/ADR-007-growth-workspace.md
  - 05_DATABASE_SCHEMA.md
  - 17_GLOSSARY.md
  - PRDs/PRD-Marketing-Funnel.md
---

# Growth Workspace — Database Schema

## Purpose

This document defines proposed PostgreSQL tables for the RootSync Growth Workspace **before implementation**. PostgreSQL is the single source of truth. External email, analytics, and automation providers synchronize from these tables.

## Ownership model

| Scope | `vendorProfileId` | Who |
|-------|-------------------|-----|
| Vendor growth | Set to vendor's profile ID | Approved vendors |
| Platform growth | `NULL` | Admins only (RootSync Inc. marketing) |

---

## Tables we reuse (not duplicated)

| Table | Role in Growth | Why not extend |
|-------|----------------|----------------|
| `User` | Member identity, `marketingOptIn`, link via `GrowthContact.rootSyncUserId` | User is platform identity, not a vendor's CRM contact |
| `VendorProfile` | Growth workspace owner | Already the vendor account boundary |
| `Order` / `OrderItem` | Revenue, purchase history, product segmentation | Commerce record; attribution added via `GrowthMarketingEvent` |
| `Booking` | Consultation scheduling, conversion endpoint | ADR-005 booking lifecycle ≠ marketing pipeline stages |
| `Offering` / `Listing` | Funnel CTA targets, campaign destinations | Catalog objects, not marketing assets |
| `CommunityPost` | Community activity signal for contacts | Public feed, not CRM |
| `ShopPage` | Platform shop landings | Admin platform content, not vendor funnels |
| `DirectoryListing` | Prospect import source (future) | Imported third-party data, not owned contacts |

---

## New tables

### `growth_contacts` — `GrowthContact`

**Purpose:** Lightweight CRM contact per vendor.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK → VendorProfile, nullable | Null = platform contact |
| `rootSyncUserId` | FK → User, nullable | Set when contact is a registered member |
| `name` | String | |
| `email` | String | Required for outreach |
| `phone` | String?, nullable | |
| `accountType` | String? | Member, Vendor, Visitor, etc. |
| `status` | String | NEW_LEAD, SUBSCRIBER, COMMUNITY_MEMBER, CUSTOMER, RETURNING_CUSTOMER, VIP, PARTNER, SPONSOR, INACTIVE |
| `leadSource` | String? | podcast, qr, landing_page, event, referral, etc. |
| `geographicRegion` | String? | |
| `growingZone` | String? | USDA zone or free text |
| `interestsJson` | Json? | Array of interest strings |
| `funnelId` | FK → GrowthFunnel, nullable | Current funnel assignment |
| `lastActivityAt` | DateTime? | Denormalized for sorting |
| `communityActivitySummary` | String? | Short text snapshot |
| `purchaseSummary` | String? | Denormalized; full history from Order |
| `consultationSummary` | String? | Denormalized; pipeline from GrowthConsultationLead |
| `createdAt`, `updatedAt` | DateTime | |

**Relationships:** → `GrowthContactTag`, `GrowthCrmNote`, `GrowthTask`, `GrowthConsultationLead`

**Indexes:** `(vendorProfileId, email)`, `(vendorProfileId, status)`, `(rootSyncUserId)`

---

### `growth_tags` — `GrowthTag`

**Purpose:** Reusable labels for contacts and segments.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | Unique per vendor |
| `color` | String? | Hex for UI |
| `createdAt` | DateTime | |

---

### `growth_contact_tags` — `GrowthContactTag`

**Purpose:** Many-to-many contact ↔ tag.

| Field | Type |
|-------|------|
| `contactId` | FK → GrowthContact |
| `tagId` | FK → GrowthTag |

**Unique:** `(contactId, tagId)`

---

### `growth_crm_notes` — `GrowthCrmNote`

**Purpose:** Free-form notes on a contact.

| Field | Type |
|-------|------|
| `id` | cuid PK |
| `contactId` | FK → GrowthContact |
| `authorUserId` | FK → User |
| `body` | String |
| `createdAt` | DateTime |

---

### `growth_tasks` — `GrowthTask`

**Purpose:** Follow-up tasks tied to contacts or campaigns.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `contactId` | FK?, nullable | |
| `title` | String | |
| `dueAt` | DateTime? | |
| `completedAt` | DateTime? | |
| `priority` | String | LOW, NORMAL, HIGH |
| `createdAt` | DateTime | |

---

### `growth_funnels` — `GrowthFunnel`

**Purpose:** Named marketing funnel with objective and metrics.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | e.g. "Podcast → Consultation" |
| `description` | String? | |
| `objective` | String? | |
| `entrySource` | String? | podcast, qr, event |
| `landingPageId` | FK → GrowthLandingPage, nullable | |
| `leadMagnet` | String? | |
| `ctaLabel` | String? | |
| `isActive` | Boolean | default true |
| `metricsJson` | Json? | Cached funnel metrics |
| `createdAt`, `updatedAt` | DateTime | |

---

### `growth_funnel_steps` — `GrowthFunnelStep`

**Purpose:** Ordered steps within a funnel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `funnelId` | FK → GrowthFunnel | |
| `sortOrder` | Int | |
| `stepType` | String | LANDING_PAGE, LEAD_MAGNET, EMAIL_SEQUENCE, NEWSLETTER, CTA, CONSULTATION, MARKETPLACE, REFERRAL |
| `label` | String | |
| `referenceId` | String? | Polymorphic ID (landing page, campaign, listing) |
| `referenceType` | String? | LANDING_PAGE, EMAIL_CAMPAIGN, LISTING, etc. |

**Unique:** `(funnelId, sortOrder)`

---

### `growth_landing_pages` — `GrowthLandingPage`

**Purpose:** Vendor marketing landing pages with conversion tracking.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `funnelId` | FK?, nullable | |
| `slug` | String | Unique per vendor |
| `title` | String | |
| `headline` | String? | |
| `contentJson` | Json? | Blocks/sections (ShopPage pattern) |
| `leadMagnetUrl` | String? | |
| `isPublished` | Boolean | |
| `viewCount` | Int | default 0 |
| `conversionCount` | Int | default 0 |
| `createdAt`, `updatedAt` | DateTime | |

**Why not `ShopPage`:** ShopPage is platform-admin shop content without funnel FKs, vendor scope, or conversion metrics.

---

### `growth_qr_campaigns` — `GrowthQrCampaign`

**Purpose:** QR code campaigns with scan tracking.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | e.g. "InvestFest Booth" |
| `campaignType` | String | INVESTFEST, FARMERS_MARKET, WORKSHOP, BOOK, etc. |
| `destinationUrl` | String | |
| `landingPageId` | FK?, nullable | |
| `funnelId` | FK?, nullable | |
| `scanCount` | Int | default 0 |
| `conversionCount` | Int | default 0 |
| `notes` | String? | |
| `isActive` | Boolean | |
| `createdAt`, `updatedAt` | DateTime | |

---

### `growth_email_campaigns` — `GrowthEmailCampaign`

**Purpose:** Newsletter and one-off email campaigns.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | |
| `subject` | String? | |
| `bodyHtml` | String? | |
| `status` | String | DRAFT, SCHEDULED, SENDING, SENT, CANCELLED |
| `scheduledAt` | DateTime? | |
| `sentAt` | DateTime? | |
| `segmentId` | FK → GrowthSegment, nullable | |
| `openCount` | Int | default 0 |
| `clickCount` | Int | default 0 |
| `unsubscribeCount` | Int | default 0 |
| `providerMessageId` | String? | Resend/external sync ID |
| `createdAt`, `updatedAt` | DateTime | |

---

### `growth_email_sequences` — `GrowthEmailSequence`

**Purpose:** Automated email sequences (welcome series, seasonal tips).

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | |
| `sequenceType` | String | WELCOME, EDUCATIONAL, SEASONAL, PRODUCT_LAUNCH, etc. |
| `stepsJson` | Json | Array of { delayDays, subject, bodyHtml } |
| `isActive` | Boolean | |
| `funnelId` | FK?, nullable | |
| `createdAt`, `updatedAt` | DateTime | |

---

### `growth_segments` — `GrowthSegment`

**Purpose:** Dynamic or static audience segments.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `name` | String | |
| `description` | String? | |
| `rulesJson` | Json | Filter rules (interests, zone, purchases, etc.) |
| `isDynamic` | Boolean | Recompute on data change |
| `memberCount` | Int | Cached count |
| `createdAt`, `updatedAt` | DateTime | |

---

### `growth_consultation_leads` — `GrowthConsultationLead`

**Purpose:** Consultation marketing pipeline beyond Booking status.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK | |
| `contactId` | FK → GrowthContact | |
| `bookingId` | FK → Booking, nullable | Set when scheduled |
| `stage` | String | LEAD, REQUESTED, SCHEDULED, COMPLETED, PROPOSAL_SENT, ACCEPTED, DECLINED, PROJECT_COMPLETE, REVIEW_RECEIVED |
| `source` | String? | funnel, qr, landing_page |
| `funnelId` | FK?, nullable | |
| `notes` | String? | |
| `createdAt`, `updatedAt` | DateTime | |

**Why not extend `Booking`:** Booking handles scheduling/payment; pipeline tracks pre-booking leads and post-consultation proposal/review stages.

---

### `growth_marketing_events` — `GrowthMarketingEvent`

**Purpose:** Attribution and analytics events (page views, QR scans, conversions).

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `vendorProfileId` | FK, nullable | |
| `eventType` | String | PAGE_VIEW, QR_SCAN, EMAIL_OPEN, EMAIL_CLICK, CONVERSION, SIGNUP |
| `contactId` | FK?, nullable | |
| `rootSyncUserId` | FK?, nullable | |
| `funnelId` | FK?, nullable | |
| `landingPageId` | FK?, nullable | |
| `qrCampaignId` | FK?, nullable | |
| `campaignId` | FK?, nullable | |
| `metadataJson` | Json? | UTM, referrer, device |
| `occurredAt` | DateTime | |

**Indexes:** `(vendorProfileId, eventType, occurredAt)`, `(landingPageId)`, `(qrCampaignId)`

---

## Entity relationship summary

```
VendorProfile
  ├── GrowthContact ──┬── GrowthContactTag ── GrowthTag
  │                   ├── GrowthCrmNote
  │                   └── GrowthConsultationLead ── Booking?
  ├── GrowthFunnel ── GrowthFunnelStep
  ├── GrowthLandingPage
  ├── GrowthQrCampaign
  ├── GrowthEmailCampaign ── GrowthSegment
  ├── GrowthEmailSequence
  ├── GrowthSegment
  ├── GrowthTask
  └── GrowthMarketingEvent

User ← GrowthContact.rootSyncUserId
User ← GrowthCrmNote.authorUserId
Order / Booking → signals for segmentation (no direct FK on Order)
```

---

## Status enums (application layer)

Defined in `src/lib/growth/roles.ts` — stored as strings in PostgreSQL per existing convention.

**Contact status:** NEW_LEAD, SUBSCRIBER, COMMUNITY_MEMBER, CUSTOMER, RETURNING_CUSTOMER, VIP, PARTNER, SPONSOR, INACTIVE

**Consultation stage:** LEAD, REQUESTED, SCHEDULED, COMPLETED, PROPOSAL_SENT, ACCEPTED, DECLINED, PROJECT_COMPLETE, REVIEW_RECEIVED

**Campaign status:** DRAFT, SCHEDULED, SENDING, SENT, CANCELLED

---

## Migration

Migration: `20260708120000_growth_workspace`

All tables created in Phase 1. No seed data. Application routes and Overview dashboard ship before CRUD APIs.
