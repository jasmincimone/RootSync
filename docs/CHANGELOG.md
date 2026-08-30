# Changelog

## 2026-08-30 — v0.1.89

### Fixed

- Changelog documents the v0.1.88 release (entry was missing from the file when that commit shipped)

------------------------------------------------------------------------

## 2026-08-30 — v0.1.88

### Changed

- **Funnel Design Studio** PRD marked **Shipped**; alignment doc updated
- Changelog backfilled for v0.1.84–v0.1.87
- `GrowthFunnelMaker` simplified to studio-only (removed unused embedded editor path)

------------------------------------------------------------------------

## 2026-08-30 — v0.1.87

### Added

- **Multi-session service bookings** — book up to 10 sessions in one checkout, with a calendar per session and quantity-based pricing

### Changed

- Service checkout creates one order with multiple linked bookings; confirmation page lists all appointments

------------------------------------------------------------------------

## 2026-08-29 — v0.1.86

### Added

- **Funnel Design Studio Phase 3** — fullscreen studio at `/account/growth/funnels/[id]/studio` and `/new/studio`
- Mobile preview frame toggle (Desktop / Mobile)
- Drag-and-drop reorder for funnel sections and media

### Changed

- Funnels list routes **New funnel** and **Open studio** into the dedicated studio (inline editor removed)

------------------------------------------------------------------------

## 2026-08-28 — v0.1.85

### Added

- **Funnel Design Studio Phase 2** — image + text, quote, and FAQ section layouts
- Soft gradient background presets on funnel pages
- Clearer gallery vs inline media guidance in the maker

------------------------------------------------------------------------

## 2026-08-27 — v0.1.84

### Added

- **ADR-010: Donation Listing Type** (documented)
- **Funnel Design Studio Phase 1** — FormSection groups, image crop on uploads, optional page background image

### Changed

- Service booking slots support half-hour start times for 60-minute (and similar) sessions

------------------------------------------------------------------------

## 2026-08-26 — v0.1.83

### Added

- **Donation listings** — fifth listing type with custom/suggested amounts and Connect or external checkout
- Donation listings in vendor form, Discover, and buy-now checkout
- GrowSpace dashboard workspace search

### Changed

- Vendor offering form surfaces field-level validation errors in red
- Donation buyer UI: custom amount above suggested amounts; checkout visible in owner preview

------------------------------------------------------------------------

## Version 1.0.0

-   Initial platform architecture
-   Marketplace
-   Community
-   AI
-   Messaging
-   Maps
-   Stripe Connect
-   Product Bible
-   Documentation framework established

------------------------------------------------------------------------

Future updates should include: - Date - Version - Added - Changed -
Fixed - Removed
