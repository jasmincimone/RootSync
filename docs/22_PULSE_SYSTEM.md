---
title: RootSync Pulse System
version: 2.0
status: Active
owner: Jasmin Smith
last_updated: 2026-07-08
related:
  - ROOTSYNC_CONSTITUTION.md
  - ROOTSYNC_PRODUCT_BIBLE.md
  - adr/ADR-008-pulse-system.md
  - 21_PULSE_SYSTEM_SCHEMA.md
  - 08_DESIGN_SYSTEM.md
---

# RootSync Pulse System

## Purpose

Pulse is **not a feature**. Pulse is a **foundational platform service** that powers the entire RootSync ecosystem.

Every meaningful action performed by a member generates Pulse. Pulse is **not points**. Pulse represents **contribution**. Pulse is the **heartbeat of RootSync**.

Every contribution strengthens both the individual member and the ecosystem as a whole.

Pulse should feel **organic**. Never game-like.

**Design references (intent, not imitation):** Apple Activity Rings, GitHub contribution graphs, Duolingo streaks — adapted for strengthening **local ecosystems**, not maximizing screen time.

---

## Core philosophy

Most platforms optimize: likes, followers, views, time on platform.

RootSync optimizes:

- **Contribution**
- **Connection**
- **Trust**
- **Local impact**

Pulse rewards meaningful participation. **Not** passive consumption.

---

## System architecture

Pulse has **two independent systems**:

| System | What it measures | Audience |
|--------|------------------|----------|
| **Individual Pulse** | Lifetime contribution of one member | Account, Vendor, Growth workspaces |
| **Platform Pulse** | Living health index of the whole ecosystem | Public RootSync Dashboard |

These systems are **related** (both use `PulseEvent` as source truth) but **calculated differently**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform modules                          │
│  Discover · Pulse feed · Stay Synced · RootSync AI · etc.   │
└──────────────────────────┬──────────────────────────────────┘
                           │ recordPulseEvent()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              pulse_events (append-only ledger)               │
│         + configurable weights, categories, thresholds       │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
               ▼                             ▼
    ┌────────────────────┐      ┌─────────────────────────┐
    │  Individual Pulse     │      │   Platform Pulse         │
    │  SUM(events) lifetime │      │   Weighted vitality index │
    │  + Activity Trend     │      │   0 – 1,000,000 scale     │
    └────────────────────┘      └─────────────────────────┘
```

**Principle:** Build Pulse once. Use it everywhere. Every RootSync module integrates via `recordPulseEvent()`.

---

## Individual Pulse

### Pulse Events

Every meaningful action generates a **Pulse Event**. Events are the permanent contribution ledger.

**Rules:**

- Events are **append-only**
- Pulse values are **never hardcoded** in application logic — stored in `pulse_score_weights` (and seeded defaults only as fallback)
- Each event belongs to a **category** (see below)
- Each event type is **admin-configurable** (weight, enabled, description)

### Example event triggers

| Trigger | Category (typical) |
|---------|-------------------|
| Creating a Pulse (post) | Community |
| Receiving a Pulse (reaction) | Community |
| Marketplace purchase | Marketplace |
| Marketplace sale | Marketplace |
| Completing consultation | Consultations |
| Hosting consultation | Consultations |
| Helpful question / answer | Community / Learning |
| Event participation / hosting | Events |
| Organization participation | Organizations |
| Volunteer work | Volunteer |
| Completing AI plan | Learning |
| Vendor verification | Verification |
| Organization verification | Verification |
| Referral | Administration |
| Future: RootSync Node activity | Growing |
| Future: Harvest reporting | Growing |
| Future: Sustainability metrics | Growing |

### Pulse Score

```
totalScore = SUM(pulseValue) FROM pulse_events WHERE userId = ?
```

- Pulse is **lifetime contribution**
- Pulse **never decreases** — no decay, no clawback on un-reactions
- **Do not** punish inactivity by reducing score

### Activity Trend (separate from score)

Activity Trend is **not** a score penalty. It encourages return without punishment.

| Trend | Meaning |
|-------|---------|
| **Increasing** | More Pulse this period than prior period |
| **Stable** | Roughly consistent contribution |
| **Quiet** | Little recent activity |
| **Returning** | Was quiet; contributing again |

Computed from recent event velocity — **not** subtracted from lifetime Pulse.

### Individual workspace display

Every workspace (Account, Vendor, Growth) shows:

- Current Pulse (lifetime score)
- Current Status (tier)
- Activity Trend
- Pulse Earned This Week
- Recent Pulse Events
- Contribution Breakdown (by category)
- Pulse History

**Future:** Top categories, milestones, recognition, badges, achievements.

### Individual status tiers

| Range | Status | Meaning |
|-------|--------|---------|
| 0 – 99 | 🌱 **Emerging** | A new member beginning their journey |
| 100 – 499 | 🌿 **Growing** | Actively contributing to the community |
| 500 – 999 | 🌳 **Rooted** | A trusted and consistent contributor |
| 1,000 – 2,499 | 🌾 **Flourishing** | Creating measurable impact |
| 2,500 – 4,999 | 🌎 **Connected** | Strengthening relationships across communities |
| 5,000+ | 🌲 **Canopy** | Leadership, mentorship, ecosystem growth |

There is **no maximum** Pulse. Members contribute forever.

Thresholds stored in `pulse_thresholds` — admin-tunable.

---

## Pulse reactions

Replace likes with Pulses. Members **Give Pulse**, not Like.

**Copy examples:**

- Give Pulse
- +1 Pulse
- Received 18 Pulses
- Trending Pulse
- Most Pulsed

**Interaction:** When giving a Pulse, the Pulse icon performs a single gentle **heartbeat** expand-then-settle animation. No confetti. Calm acknowledgment.

---

## Vendor reviews (Pulse ratings)

Replace star ratings with Pulse ratings.

| Former | New |
|--------|-----|
| ★★★★★ | ♥♥♥♥♥ (Pulse icons) |
| 4.8 stars | 4.8 Pulses |
| Highest rated | Highest Pulsed Vendors |
| Best seller | Most Pulsed Products |

**Phase:** Deferred until Individual + Platform Pulse core is stable. See [ADR-008](./adr/ADR-008-pulse-system.md).

---

## Platform Pulse

Platform Pulse is **not** the sum of everyone's Individual Pulse.

Platform Pulse is a **living health index** — the heartbeat of the entire RootSync ecosystem.

### Scale

- Range: **0** to **1,000,000**
- Display the number: `742,318`
- **Do not** display percentages
- Always display **Platform Status** label

### Weighted inputs (configurable)

| Input | Notes |
|-------|-------|
| Daily active members | Participation breadth |
| New members | Growth signal |
| Pulse events | Contribution volume |
| Marketplace activity | Commerce health |
| Messages | Connection |
| Consultations | Service economy |
| Organizations | Community structure |
| Events | Gatherings |
| Vendor activity | Supply side |
| AI conversations | Learning engagement |
| Volunteer activity | Civic contribution |
| Referrals | Organic growth |
| Verified contributions | Trust signal |
| Future: RootSync Nodes | Infrastructure |
| Future: Harvest reporting | Growing economy |
| Future: Environmental impact | Sustainability |
| Future: Food donations | Community impact |

Weights stored in `platform_pulse_weights` — admin-tunable. See [21_PULSE_SYSTEM_SCHEMA.md](./21_PULSE_SYSTEM_SCHEMA.md).

### Platform status tiers

| Range | Status |
|-------|--------|
| 0 – 99,999 | 🌱 **Awakening** |
| 100,000 – 249,999 | 🌿 **Growing** |
| 250,000 – 499,999 | 🌳 **Rooted** |
| 500,000 – 749,999 | 🌾 **Flourishing** |
| 750,000 – 999,999 | 🌎 **Thriving** |
| 1,000,000 | ✨ **Fully Synced** |

---

## Public RootSync Dashboard

Route: `/rootsync/dashboard`

**Feels like observing a living ecosystem — never analytics software.**

### Primary display

- ♥ **Platform Pulse** (absolute number)
- **Platform Status**
- **Members Synced** (goal: 1,000,000 Members Synced)

### Widget metrics (DB-driven, admin-managed presentation)

- Pulses Today
- Marketplace Activity
- Messages Sent
- AI Conversations
- Events
- Organizations
- Consultations
- Vendor Activity
- Pulse Growth
- Newest Communities

Future metrics plug into `public_dashboard_widgets` without dashboard redesign.

---

## Pulse earned toast (signature UX)

When a member earns Pulse, show a subtle toast:

```
♥  +5 Pulse
Your answer helped another grow.
```

- Uses official `PulseIcon`
- Icon gently expands once (heartbeat), then settles
- No confetti, no fireworks
- Calm, satisfying acknowledgment

**Triggers:** Any new `PulseEvent` for the acting member (configurable per surface).

---

## Admin controls

Admins configure **presentation and weighting** — not underlying statistics.

| Control | Table / surface |
|---------|----------------|
| Event weights | `pulse_score_weights` |
| Event categories | `pulse_categories` |
| Individual status thresholds | `pulse_thresholds` |
| Platform input weights | `platform_pulse_weights` |
| Platform status thresholds | `platform_pulse_thresholds` |
| Dashboard widgets | `public_dashboard_widgets` |
| Announcements | `public_dashboard_announcements` |
| Campaigns / seasonal events | Future `pulse_campaigns` |

---

## Technical requirements summary

| Area | Document |
|------|----------|
| Event + category schema | [21_PULSE_SYSTEM_SCHEMA.md](./21_PULSE_SYSTEM_SCHEMA.md) |
| Architecture decision | [ADR-008](./adr/ADR-008-pulse-system.md) |
| Score calculation | `src/lib/pulse/score.ts` |
| Platform calculation | `src/lib/pulse/platformMetrics.ts` (evolving) |
| Event recording API | `src/lib/pulse/recordEvent.ts` |
| Integration hooks | `src/lib/pulse/hooks.ts` |

### Caching strategy

| Layer | Strategy |
|-------|----------|
| Individual score | Denormalized `pulse_scores` row; recalc on event insert |
| Platform Pulse | Denormalized snapshot + daily rollup `platform_pulse_daily` |
| Public dashboard | Read snapshot + widget config; refresh on cron / event batch |
| Member workspace | Server-rendered on workspace load; optional short TTL cache |

### Aggregation strategy

- **Real-time:** Individual score on each `PulseEvent` insert
- **Near-real-time:** Platform Pulse snapshot every N minutes (cron) or on significant batch
- **Daily:** `platform_pulse_daily` for trends and dashboard charts

---

## Implementation phases

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Navigation, routes, Prisma models, feed, basic meter | Shipped (scaffold) |
| **2A–C** | Config seed, Give Pulse, event hooks, backfill | Shipped |
| **3** | v2 tiers (6 individual + 6 platform), categories, Activity Trend | **Next** |
| **4** | Workspace Pulse panel (history, breakdown, weekly) | Planned |
| **5** | Platform Pulse weighting engine + public dashboard CMS | Planned |
| **6** | Pulse earned toast + heartbeat animation | Planned |
| **7** | Vendor Pulse reviews (replace stars) | Planned |
| **8** | Admin Pulse manager UI | Planned |
| **9** | Milestones, badges, campaigns | Future |

---

## Non-goals

- Leaderboards optimized for competition
- Pulse decay or score reduction
- Gamified streaks that punish missed days (Activity Trend replaces this)
- Admin manual editing of live statistics
- Hardcoded point values in feature code

---

## Related

- [ROOTSYNC_CONSTITUTION.md](./ROOTSYNC_CONSTITUTION.md) — Community before commerce; trust fundamental
- [ROOTSYNC_PRODUCT_BIBLE.md](./ROOTSYNC_PRODUCT_BIBLE.md) — Platform philosophy
- [08_DESIGN_SYSTEM.md](./08_DESIGN_SYSTEM.md) — Visual language for Pulse surfaces
