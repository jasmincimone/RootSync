---
title: Pulse System — Database Schema
version: 2.0
status: Active
owner: Jasmin Smith
last_updated: 2026-07-08
related:
  - 22_PULSE_SYSTEM.md
  - adr/ADR-008-pulse-system.md
  - 05_DATABASE_SCHEMA.md
  - 17_GLOSSARY.md
---

# Pulse System — Database Schema

## Purpose

Defines PostgreSQL tables for the RootSync Pulse platform service. PostgreSQL remains the single source of truth.

**Product spec:** [22_PULSE_SYSTEM.md](./22_PULSE_SYSTEM.md)

---

## Design principles

1. **Append-only events** — `pulse_events` is the contribution ledger
2. **No hardcoded values** — weights and thresholds live in config tables
3. **Categories** — every event type maps to a category for breakdown UI
4. **Two calculators** — Individual Pulse (sum) vs Platform Pulse (weighted index)
5. **No decay** — lifetime score only increases; Activity Trend is separate

---

## Tables we reuse

| Table | Pulse role |
|-------|------------|
| `CommunityPost` | Pulse posts (UI: Pulse; rename deferred) |
| `User` | Member identity |
| `DirectThread` / `DirectMessage` | Stay Synced |
| `Order` / `Booking` | Marketplace + consultations |
| `VendorProfile` / `Listing` / `Offering` | Vendor ecosystem signals |

---

## Core tables (Phase 1 — implemented)

### `pulse_events` — `PulseEvent`

Append-only contribution ledger.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `userId` | FK → User | Member who earned Pulse |
| `eventType` | String | e.g. `PULSE_CREATED`, `ORDER_VERIFIED` |
| `pulseValue` | Int | Snapshot of weight at event time |
| `relatedEntityType` | String? | Polymorphic: `listing`, `order`, etc. |
| `relatedEntityId` | String? | |
| `metadataJson` | Json? | Extensible context |
| `createdAt` | DateTime | Immutable |

**Indexes:** `(userId, createdAt)`, `(eventType, createdAt)`, `(relatedEntityType, relatedEntityId)`

**Phase 3 addition (planned):** `categoryId` FK → `pulse_categories` (denormalized from event type config for fast breakdown queries).

---

### `pulse_reactions` — `PulseReaction`

One Pulse per user per post.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `postId` | FK → CommunityPost | |
| `giverUserId` | FK → User | |
| `createdAt` | DateTime | |

**Unique:** `(postId, giverUserId)`

---

### `pulse_scores` — `PulseScore`

Denormalized Individual Pulse for fast reads.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `userId` | FK → User, unique | |
| `totalScore` | Int | Lifetime SUM of events — **never decreases** |
| `status` | String | Tier key: `EMERGING` … `CANOPY` |
| `activityTrend` | String? | `INCREASING` \| `STABLE` \| `QUIET` \| `RETURNING` |
| `pulseThisWeek` | Int? | Sum last 7 days |
| `trend7d` | Int? | **Deprecated** — replace with `activityTrend` + `pulseThisWeek` |
| `lastEventAt` | DateTime? | |
| `updatedAt` | DateTime | |

---

### `pulse_score_weights` — `PulseScoreWeight`

Configurable per-event weights.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `eventType` | String, unique | |
| `categoryId` | String? FK | **Phase 3** → `pulse_categories` |
| `pulseValue` | Int | |
| `enabled` | Boolean | Anti-spam: disable noisy events |
| `description` | String? | Admin label |
| `updatedAt` | DateTime | |

---

### `pulse_thresholds` — `PulseThreshold`

Individual status tier boundaries.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `status` | String, unique | `EMERGING`, `GROWING`, `ROOTED`, `FLOURISHING`, `CONNECTED`, `CANOPY` |
| `minScore` | Int | Inclusive lower bound |
| `label` | String | e.g. "Growing" |
| `emoji` | String? | e.g. 🌿 |
| `sortOrder` | Int | |

**v2 defaults:**

| status | minScore | label |
|--------|----------|-------|
| EMERGING | 0 | Emerging |
| GROWING | 100 | Growing |
| ROOTED | 500 | Rooted |
| FLOURISHING | 1000 | Flourishing |
| CONNECTED | 2500 | Connected |
| CANOPY | 5000 | Canopy |

---

## New tables (Phase 3 — planned)

### `pulse_categories` — `PulseCategory`

Event taxonomy for contribution breakdown.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `key` | String, unique | `COMMUNITY`, `MARKETPLACE`, … |
| `label` | String | Display name |
| `sortOrder` | Int | |
| `enabled` | Boolean | |

**Initial categories:**

`COMMUNITY` · `MARKETPLACE` · `LEARNING` · `MESSAGING` · `EVENTS` · `CONSULTATIONS` · `ORGANIZATIONS` · `GROWING` · `VOLUNTEER` · `VERIFICATION` · `ADMINISTRATION`

Future categories added via admin — no schema migration required beyond seed row.

---

### `platform_pulse_weights` — `PlatformPulseWeight`

Configurable weights for Platform Pulse vitality index inputs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `metricKey` | String, unique | e.g. `daily_active_members`, `pulse_events` |
| `weight` | Float | Multiplier in index formula |
| `enabled` | Boolean | |
| `description` | String? | |
| `updatedAt` | DateTime | |

---

### `platform_pulse_thresholds` — `PlatformPulseThreshold`

Platform status tier boundaries (0 – 1,000,000 scale).

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `status` | String, unique | `AWAKENING` … `FULLY_SYNCED` |
| `minValue` | Int | |
| `label` | String | |
| `emoji` | String? | |
| `sortOrder` | Int | |

---

### `platform_pulse_snapshots` — `PlatformPulseSnapshot`

Latest computed Platform Pulse (denormalized).

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `pulseValue` | Int | 0 – 1,000,000 |
| `status` | String | Platform tier |
| `metricsJson` | Json | Input values used in calculation |
| `computedAt` | DateTime | |

Single-row or latest-by-`computedAt` read pattern.

---

## Aggregation tables (Phase 1 — implemented)

### `platform_pulse_daily` — `PlatformPulseDaily`

Daily rollup for trends and dashboard charts.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `date` | Date, unique | UTC day |
| `totalPulseValue` | Int | Sum of event values that day |
| `eventCount` | Int | |
| `activeMemberCount` | Int | Distinct users with events |
| `computedAt` | DateTime | |

---

### `public_dashboard_widgets` — `PublicDashboardWidget`

Admin-managed dashboard presentation.

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `key` | String, unique | `members_synced`, `pulses_today`, … |
| `label` | String | |
| `widgetType` | String | `metric`, `milestone`, `announcement`, `spotlight` |
| `enabled` | Boolean | |
| `sortOrder` | Int | |
| `configJson` | Json? | Milestone target, spotlight IDs |
| `updatedAt` | DateTime | |

---

### `public_dashboard_announcements` — `PublicDashboardAnnouncement`

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid PK | |
| `title` | String | |
| `body` | String? | |
| `href` | String? | |
| `startsAt` / `endsAt` | DateTime? | |
| `enabled` | Boolean | |
| `sortOrder` | Int | |
| `createdAt` | DateTime | |

---

## Future tables (Phase 9+)

| Table | Purpose |
|-------|---------|
| `pulse_milestones` | Recognized contribution landmarks |
| `pulse_badges` | Visual recognition assets |
| `pulse_member_badges` | Earned badges per member |
| `pulse_campaigns` | Seasonal multipliers / featured events |
| `pulse_vendor_ratings` | Pulse-based reviews (replace stars) |

---

## Calculation reference

### Individual Pulse Score

```sql
totalScore = SUM(pulseValue) FROM pulse_events WHERE userId = ?
status     = highest pulse_thresholds row WHERE minScore <= totalScore
```

Recalculated on each event insert. **Never subtract.**

### Activity Trend

```text
pulseThisWeek = SUM(pulseValue) WHERE createdAt >= now() - 7 days
pulsePriorWeek = SUM(pulseValue) WHERE createdAt BETWEEN now()-14d AND now()-7d

IF no events in 30d        → QUIET
ELIF pulseThisWeek > prior   → INCREASING
ELIF pulseThisWeek > 0 AND was QUIET → RETURNING
ELSE                         → STABLE
```

### Platform Pulse (v2 — weighted index)

```text
platformPulse = clamp(0, 1_000_000,
  Σ (normalizedMetric[key] × platform_pulse_weights.weight)
)
```

Normalization functions per metric (e.g. log scale, caps) defined in `src/lib/pulse/platformMetrics.ts` — **not** a raw sum of member scores.

### Platform Pulse (v1 — current implementation)

Simple daily event sum in `platform_pulse_daily`. **Migrate to weighted index in Phase 5.**

---

## Event types (current code)

See `PULSE_EVENT_TYPES` in `src/lib/pulse/eventTypes.ts`. All weights in `pulse_score_weights`.

| Event type | Default | Category (v2) |
|------------|---------|-----------------|
| `PULSE_CREATED` | 5 | Community |
| `PULSE_RECEIVED` | 1 | Community |
| `PROFILE_COMPLETED` | 10 | Community |
| `LISTING_PUBLISHED` | 15 | Marketplace |
| `ORDER_VERIFIED` | 8 | Marketplace |
| `BOOKING_COMPLETED` | 8 | Consultations |
| `MESSAGE_SENT` | 1 | Messaging |
| `DAILY_ACTIVITY` | 2 | Community |
| `AI_GROW_PLAN_COMPLETED` | 12 | Learning |

---

## Integration contract

Any platform module records contribution via:

```typescript
import { recordPulseEventOnce } from "@/lib/pulse/recordEvent";

await recordPulseEventOnce({
  userId,
  eventType: PULSE_EVENT_TYPES.ORDER_VERIFIED,
  relatedEntityType: "order",
  relatedEntityId: order.id,
});
```

Use `recordPulseEventOnce` when idempotency is required. Use `recordPulseEvent` when each occurrence should count (e.g. multiple Pulses received).

Hooks for common triggers: `src/lib/pulse/hooks.ts`. Historical credit: `src/lib/pulse/backfill.ts`.

---

## Migration path from v1

| v1 (shipped) | v2 (target) |
|--------------|-------------|
| 3 status tiers | 6 individual + 6 platform tiers |
| `trend7d` int delta | `activityTrend` enum + `pulseThisWeek` |
| Platform = event sum | Platform = weighted vitality index |
| No categories | `pulse_categories` + FK on weights |
| Code defaults in `eventTypes.ts` | DB-only weights (defaults as seed fallback) |

Migration `20260708180000_pulse_system` created v1 tables. Phase 3 migration adds categories, platform weights/thresholds, snapshot, and extends `pulse_scores`.
