---
adr: 005
title: Service Bookings (scheduling, payments, calendar)
status: Accepted
date: 2026-06-29
owner: Jasmin Smith
related:
  - ADR-003-calendar-abstraction.md
  - ADR-004-offering-variants.md
  - 19_SERVICE_BOOKINGS.md
---

# ADR-005: Service Bookings

## Context

RootSync vendors list **Services** (consultations, sessions) on the marketplace. Members need to:

1. Pick a variant (optional) and time slot
2. Pay via Stripe Checkout
3. Receive a Google Calendar event + Google Meet link (virtual/hybrid)
4. Manage bookings as member or vendor (cancel, complete, refund)

PostgreSQL is the source of truth; Google Calendar is a sync target (ADR-003).

## Decision

### Data model

- **`Booking`** — one scheduled service appointment; links `Listing`, `Offering`, optional `OfferingVariant`, `Order`, member, vendor
- **`ServiceAvailabilityRule`** — weekly hours per offering (vendor-configured)
- **`ServiceIntakeQuestion`** / **`BookingIntakeAnswer`** — pre-session intake
- **Statuses:** `PENDING_PAYMENT` → `CONFIRMED` → `COMPLETED` | `CANCELLED`

### Checkout & confirmation

1. Member selects slot (+ variant) → `POST /api/marketplace/listings/[id]/book`
2. Creates `Booking` (pending) + `Order` (pending) + Stripe Checkout session
3. On payment: `checkout.session.completed` webhook **or** `/api/bookings/confirm-from-session` (local dev fallback)
4. `confirmPaidServiceBooking()` — calendar event, Meet link, Resend emails, status `CONFIRMED`

### Cancellation & refunds

- **Who:** member (`/api/account/bookings/[id]`) or vendor (`/api/vendor/bookings/[id]`)
- **When:** `PENDING_PAYMENT` or `CONFIRMED` only (not `COMPLETED`)
- **Paid bookings:** full Stripe refund before DB cancel; Connect destination charges use `reverse_transfer` + `refund_application_fee`
- **Order** → `refunded` + `stripeRefundId` + `refundedAt`
- Calendar event cancelled with attendee notifications; Resend cancellation emails

If refund fails, booking is **not** cancelled (member keeps slot until support intervenes).

### Calendar & email

- `CalendarService` creates events with member + vendor attendees; `sendUpdates: all` on create
- Virtual/hybrid services request Meet via domain-wide delegation (`GOOGLE_CALENDAR_IMPERSONATE_USER`)
- Resend sends confirmation and cancellation emails (in addition to Google Calendar invites)

### Account UX

- **My bookings** — services the member booked
- **Incoming appointments** (vendor) — bookings on the vendor's listings
- Reference line: `Booking #` + `Order #` (short IDs)

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Calendly embed | Less platform control; vendor UX fragmented |
| Refund without blocking cancel | Member charged after cancel is worse UX than failed cancel |
| Partial refunds by policy | MVP: full refund only; policy engine deferred |

## Consequences

- Requires Stripe webhook (or confirm-from-session) in all environments
- Requires Google Calendar + Resend env vars for full experience
- Vendors need Connect onboarding for destination charges (optional fallback: platform collects)
