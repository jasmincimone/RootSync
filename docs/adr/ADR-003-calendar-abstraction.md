---
adr: 003
title: Calendar Abstraction and Google Workspace Integration
status: Accepted
date: 2026-06-28
owner: Jasmin Smith
related:
  - ../15_DOMAIN_MODEL.md
  - ../PRDs/PRD-Consultation-Booking.md
  - ADR-001-offering-listing-model.md
---

# ADR-003: Calendar Abstraction and Google Workspace Integration

## Status

Accepted

## Context

RootSync Service Bookings require calendar events and Google Meet links for virtual services. Google infrastructure is configured for **The Fix Urban Roots** calendar (`thefixurbanroots@rootsync.io`), with a service account granted **Make changes and manage sharing**.

PostgreSQL remains the source of truth; Google Calendar is a sync target only.

## Decision

### 1. CalendarService abstraction

Booking code calls `CalendarService` only — never Google APIs directly.

```
src/services/calendar/
  calendar-provider.ts      # interface
  google-calendar-provider.ts
  calendar.service.ts
  calendar.types.ts
  calendar.constants.ts
  google-credentials.ts
```

Future providers (Outlook, Apple, Calendly) implement `CalendarProvider` without changing booking logic.

### 2. Credential loading

| Environment | Variable |
|-------------|----------|
| Local | `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` → `./keys/google-service-account.json` |
| Vercel | `GOOGLE_SERVICE_ACCOUNT_JSON` (full JSON string) |

Priority: JSON env first, then file path. Clear error if neither is set.

`GOOGLE_CALENDAR_ID` is required for all environments.

### 3. Google Meet

Meet links are created via Calendar API `conferenceData` (`hangoutsMeet`) on event insert/update — no separate Meet API.

**Requires Google Workspace domain-wide delegation.** A service account with calendar sharing alone can create events but cannot impersonate a user or generate Meet links.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CALENDAR_IMPERSONATE_USER` | Workspace user to act as (e.g. `thefixurbanroots@rootsync.io`) |

#### One-time Workspace Admin setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → IAM → Service Accounts → `rootsync-bookings@…` → **Advanced settings** → enable **Domain-wide delegation**.
2. Open [Google Admin Console](https://admin.google.com/) → Security → Access and data control → API controls → **Domain-wide delegation** → **Add new**.
3. Client ID: `105315689093662226939` (from service account JSON `client_id` field).
4. OAuth scopes: `https://www.googleapis.com/auth/calendar`
5. Set `GOOGLE_CALENDAR_IMPERSONATE_USER=thefixurbanroots@rootsync.io` in `.env.local` and Vercel.

Without delegation, `npm run calendar:poc` fails with `unauthorized_client`. Event-only sync (no Meet) still works without impersonation.

### 4. Attendees and email invites

Service accounts cannot add event attendees without Google Workspace **domain-wide delegation**. MVP booking flow will:

- Store Member + Vendor emails on the `Booking` record in PostgreSQL
- Send confirmation via **Resend** (not Calendar attendee invites)
- Optionally add attendees when vendor OAuth or delegation is available

## Consequences

- `googleapis` dependency added
- POC script `npm run calendar:poc` validates live integration before booking engine
- Unit tests cover credential resolution and CalendarService delegation

## Proof of concept

Run `npm run calendar:poc` after configuring `.env.local`. Must print Event ID + Meet URL, then delete the test event.
