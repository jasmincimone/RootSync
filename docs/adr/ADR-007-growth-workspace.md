---
adr: 007
title: Growth Workspace — Marketing, CRM, and Growth System
status: Accepted
date: 2026-07-08
owner: Jasmin Smith
related:
  - ../17_GLOSSARY.md
  - ../20_GROWTH_WORKSPACE_SCHEMA.md
  - ../PRDs/PRD-Marketing-Funnel.md
  - ADR-001-offering-listing-model.md
  - ADR-005-service-bookings.md
---

# ADR-007: Growth Workspace

## Status

Accepted

## Context

RootSync Workspace (`/account`) is the central operating system for every account. Member, vendor, and admin tools exist today, but marketing, CRM, and growth tooling are deferred (see `docs/18_DOCS_CODE_ALIGNMENT.md`). The only marketing hook in PostgreSQL is `User.marketingOptIn`.

The product vision is a **mission-centric growth command center** — not a separate email tool or corporate CRM. Vendors, educators, nonprofits, and creators need to nurture relationships, run campaigns, track funnels, and understand what to do next from one workspace.

## Decision

### 1. New top-level Workspace section: **Growth**

Route prefix: `/account/growth`

Integrated modules (each gets its own route):

| Module | Route |
|--------|-------|
| Overview | `/account/growth` |
| CRM | `/account/growth/crm` |
| Funnels | `/account/growth/funnels` |
| Campaigns | `/account/growth/campaigns` |
| Landing Pages | `/account/growth/landing-pages` |
| QR Campaigns | `/account/growth/qr-campaigns` |
| Newsletter | `/account/growth/newsletter` |
| Audience | `/account/growth/audience` |
| Events | `/account/growth/events` |
| Consultations | `/account/growth/consultations` |
| Analytics | `/account/growth/analytics` |
| AI Marketing | `/account/growth/ai-marketing` |

Navigation: new **Growth** section in `AccountNav`, alongside Member / Vendor services / Admin.

### 2. Vendor-scoped ownership

Growth data is owned by **`VendorProfile`**, not `User` directly.

| Rationale | Detail |
|-----------|--------|
| Business context | CRM contacts, funnels, and campaigns belong to a vendor's mission |
| Existing pattern | Offerings, listings, bookings already scope via `vendorProfileId` |
| Member accounts | Members without an approved vendor profile see an upgrade/apply prompt |

Platform-wide RootSync marketing (InvestFest, platform newsletter) uses `vendorProfileId = null` on Growth tables — admin-only.

### 3. PostgreSQL remains source of truth

All contacts, campaigns, funnels, segments, metrics, and pipeline stages live in PostgreSQL. External providers (Resend, Mailchimp, analytics) **sync from** PostgreSQL — never the reverse.

Reuse existing tables as **signals**, not CRM replacements:

| Existing table | Growth use |
|----------------|------------|
| `User` | Link `GrowthContact.rootSyncUserId`; `marketingOptIn` for platform consent |
| `Order` / `OrderItem` | Purchase history, revenue, segmentation |
| `Booking` | Consultation conversions; link to `GrowthConsultationLead` |
| `CommunityPost` | Community activity signals |
| `DirectMessage` | Engagement signals (not campaign reply tracking) |
| `ShopPage` | Platform shop landings — **not** vendor marketing landings |

### 4. New `Growth*` Prisma models

See `docs/20_GROWTH_WORKSPACE_SCHEMA.md` for full table documentation before migration.

Core entities:

- `GrowthContact` — lightweight CRM contact
- `GrowthTag` + `GrowthContactTag` — tagging
- `GrowthCrmNote`, `GrowthTask` — notes and follow-ups
- `GrowthFunnel` + `GrowthFunnelStep` — funnel builder
- `GrowthLandingPage` — vendor landing pages
- `GrowthQrCampaign` — QR tracking
- `GrowthEmailCampaign`, `GrowthEmailSequence` — newsletter/campaigns
- `GrowthSegment` — audience segments
- `GrowthConsultationLead` — consultation pipeline (extends Booking, not replaces)
- `GrowthMarketingEvent` — attribution and analytics events

### 5. Consultation pipeline vs Booking

`Booking` remains the commerce/scheduling record (ADR-005). `GrowthConsultationLead` adds marketing pipeline stages (Lead → Requested → Scheduled → Completed → Proposal → Accepted/Declined → Project Complete → Review).

Optional `bookingId` FK links pipeline to a real booking when scheduled.

### 6. Landing pages vs ShopPage

`ShopPage` is admin-editable platform shop content. Vendor marketing landings use `GrowthLandingPage` with funnel/campaign FKs, conversion tracking, and public slug under a future `/g/[slug]` or `/v/[shopSlug]/p/[slug]` route.

### 7. AI Marketing

RootSync AI (`RootSyncConversation`) powers suggested actions in Growth. AI outputs are stored as drafts on `GrowthEmailCampaign`, `GrowthLandingPage`, or `GrowthFunnel` — never sent without user approval.

### 8. Access control

| Role | Access |
|------|--------|
| Approved vendor | Full Growth workspace for their `vendorProfileId` |
| Admin | Full Growth + platform-scoped records (`vendorProfileId = null`) |
| Member (no vendor) | Redirect to vendor apply with explanation |
| Pending vendor | Same as member until approved |

Reuse `canManageVendorListings` pattern via `src/lib/growthAccess.ts`.

### 9. Phased delivery

| Phase | Scope |
|-------|-------|
| **1 (this ADR)** | Schema docs, Prisma models, routes, nav, Overview dashboard shell, module placeholders |
| **2** | CRM CRUD, contact import from orders/bookings |
| **3** | Funnels, landing pages, QR campaigns |
| **4** | Newsletter/campaigns + Resend marketing sync |
| **5** | Analytics rollups, consultation pipeline UI |
| **6** | AI Marketing actions |

## Alternatives Considered

**Extend `User` with CRM fields** — Rejected: contacts are vendor relationships, not self-profile data.

**Use `DirectoryListing` as CRM** — Rejected: imported USDA data is prospecting input, not owned contacts.

**Single monolithic Growth page** — Rejected: spec requires integrated modules with dedicated navigation.

**Third-party CRM as source of truth** — Rejected: violates constitution; PostgreSQL must own contact and campaign state.

## Consequences

- New migration adds ~14 Growth tables
- Vendor dashboard should link to Growth Overview
- Public landing/QR routes needed in Phase 3
- Email provider sync service needed in Phase 4
- Glossary should gain Growth-specific terms in a follow-up edit
