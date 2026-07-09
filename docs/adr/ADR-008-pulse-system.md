---
title: ADR-008 — Pulse System
status: Accepted
date: 2026-07-08
amended: 2026-07-08
---

# ADR-008 — Pulse System

## Context

RootSync is evolving from a collection of pages into a connected ecosystem. **Pulse is not a feature** — it is a foundational platform service that every module integrates with.

Pulse is the living heartbeat of the platform — rewarding meaningful **contribution** over passive engagement. Pulse is **not points**.

**Canonical product spec:** [22_PULSE_SYSTEM.md](../22_PULSE_SYSTEM.md)

## Decision

### 1. Terminology

| Former | New |
|--------|-----|
| Community (product surface) | **Pulse** |
| Community post | **Pulse** (post) |
| Like | **Give a Pulse** |
| Star rating | **Pulse rating** (Phase 7) |
| Messages / Messenger | **Stay Synced** |

Internal database tables (`CommunityPost`, etc.) remain unchanged until a dedicated migration. UI and routes adopt Pulse branding.

### 2. Navigation

Primary platform navigation (header + mobile menu):

1. Discover Marketplace → `/discover`
2. RootSync AI → `/rootsyncai`
3. Stay Synced → `/messages/inbox`
4. Pulse → `/pulse`

Workspace (Account, Vendor, Growth, Admin) stays inside the Account menu — **not** in primary nav.

### 3. Two independent systems

| System | Calculation | Scale |
|--------|-------------|-------|
| **Individual Pulse** | SUM of member's `pulse_events` (lifetime) | Unbounded |
| **Platform Pulse** | Weighted ecosystem vitality index | 0 – 1,000,000 |

Platform Pulse is **not** the sum of all member scores.

### 4. Pulse Events

Every meaningful platform action creates an append-only `PulseEvent`:

- `eventType` — configurable (see `pulse_score_weights`)
- `userId` — member who contributed
- `pulseValue` — snapshot of weight at event time
- `relatedEntityType` / `relatedEntityId` — polymorphic link
- `metadataJson` — extensible context
- **Category** — via event type config (Phase 3)

**Do not hardcode Pulse values** in feature code. Weights live in PostgreSQL.

### 5. Individual Pulse Score

- **Lifetime contribution** — never decreases
- **No decay** — inactivity does not reduce score
- **Activity Trend** (separate field): Increasing | Stable | Quiet | Returning

**Status tiers (v2):**

| Range | Status |
|-------|--------|
| 0 – 99 | 🌱 Emerging |
| 100 – 499 | 🌿 Growing |
| 500 – 999 | 🌳 Rooted |
| 1,000 – 2,499 | 🌾 Flourishing |
| 2,500 – 4,999 | 🌎 Connected |
| 5,000+ | 🌲 Canopy |

Stored in `pulse_thresholds` — admin-tunable.

### 6. Platform Pulse

Weighted vitality index. Display absolute number (e.g. `742,318`), never percentages.

**Platform status tiers:**

| Range | Status |
|-------|--------|
| 0 – 99,999 | 🌱 Awakening |
| 100,000 – 249,999 | 🌿 Growing |
| 250,000 – 499,999 | 🌳 Rooted |
| 500,000 – 749,999 | 🌾 Flourishing |
| 750,000 – 999,999 | 🌎 Thriving |
| 1,000,000 | ✨ Fully Synced |

Weights in `platform_pulse_weights` (Phase 3).

### 7. Pulse Reactions

`PulseReaction` replaces likes. One reaction per user per post. UI: "Give a Pulse", "+1 Pulse", "Received N Pulses".

**UX:** Pulse icon performs a single heartbeat animation on give/earn — no confetti.

### 8. Pulse earned toast

Signature UX: subtle toast with `PulseIcon`, value, and contextual message. Heartbeat animation on earn.

### 9. Public Dashboard

`/rootsync/dashboard` — living ecosystem view, not analytics software.

Admins manage presentation via `PublicDashboardWidget` and `PublicDashboardAnnouncement`. **Admins do not manually edit live statistics.**

### 10. Workspace Pulse

Every workspace displays: Pulse, Status, Activity Trend, weekly earn, recent events, category breakdown, history.

### 11. Integration contract

```typescript
recordPulseEvent() / recordPulseEventOnce()  // src/lib/pulse/recordEvent.ts
hook*()                                       // src/lib/pulse/hooks.ts
```

Build once. Use everywhere.

### 12. Pulse Icon

`/images/pulse/pulse-icon.png` via `PulseIcon` component. SVG replacement without consumer changes.

## Consequences

- **Positive:** Unified contribution ledger; trust signals; ecosystem narrative; extensible to nodes, harvest, sustainability.
- **Negative:** Large surface area; requires careful hook hygiene and admin tooling.
- **Deferred:** Vendor Pulse reviews, milestones/badges, campaigns, table renames.

## Implementation status

| Phase | Scope |
|-------|--------|
| 1 | Models, nav, feed, basic meter |
| 2 | Hooks, reactions, backfill |
| 3 | v2 tiers, categories, Activity Trend |
| 4–8 | Workspace panel, platform engine, toast, reviews, admin UI |

## Related

- [22_PULSE_SYSTEM.md](../22_PULSE_SYSTEM.md) — product spec
- [21_PULSE_SYSTEM_SCHEMA.md](../21_PULSE_SYSTEM_SCHEMA.md) — database schema
- [ROOTSYNC_CONSTITUTION.md](../ROOTSYNC_CONSTITUTION.md)
- [ROOTSYNC_PRODUCT_BIBLE.md](../ROOTSYNC_PRODUCT_BIBLE.md)
