---
adr: 009
title: Guest Service Bookings (no account required)
status: Accepted
date: 2026-08-17
owner: Jasmin Smith
related:
  - ADR-005-service-bookings.md
  - ADR-003-calendar-abstraction.md
  - 19_SERVICE_BOOKINGS.md
---

# ADR-009: Guest Service Bookings

## Context

ADR-005 required a signed-in member for every booking: `/discover/listings/[id]/book`
redirected anonymous visitors to `/login`, and `Booking.memberUserId` was a non-null
foreign key to `User`.

Guest purchasing already existed elsewhere on the platform. Product and event checkout
identify buyers by `Order.email` with a nullable `Order.userId`, and `BuyNowButton`
collects an email from signed-out shoppers. Service bookings were the only commerce path
that demanded an account, which cost first-time neighbors a conversion at the exact moment
they were ready to pay.

Confirmation emails and Google Calendar invites already read `Booking.memberEmail` and
`memberName` rather than joining to `User`, so the calendar and Meet integration did not
depend on an account existing.

## Decision

### Identity

- `Booking.memberUserId` becomes **nullable**, mirroring `Order.userId`. A guest booking is
  identified by `memberEmail` alone.
- `resolveBookingActor()` returns the signed-in member when a session exists, otherwise a
  validated guest `{ email, name }`.
- Guest bookings are **claimed by email**: `/api/account/bookings` and `memberOwnsBooking()`
  match on `memberUserId` OR `memberEmail`, so signing up later surfaces past bookings —
  the same rule the orders page already used.

### Vendor control

- `ServiceDetails.requiresAccountToBook` (default `false`) lets a vendor demand an account
  per service listing. When set, the book page redirects to `/login` as before.

### Slot contention

Pending, unpaid bookings **no longer hold a slot**; only `CONFIRMED` blocks availability.
This removes the pre-existing problem of abandoned Stripe checkouts stranding a vendor's
calendar, and it means two people may pay for the same time.

`confirmPaidServiceBooking()` re-checks for an overlapping confirmed booking before
confirming. The runner-up is refunded via `refundBookingPayment()`, cancelled, and emailed
a link back to the calendar. If that refund fails the booking is left pending for manual
review rather than being cancelled without a refund.

### Cancellation policy

- Self-serve cancellation (member or guest) refunds in full only up to
  `BOOKING_FREE_CANCELLATION_HOURS` (24) before the appointment.
- **Vendor**-initiated cancellation always refunds in full, regardless of timing.
- Guests cancel through a stateless signed link (`/bookings/[id]?token=…`), where the token
  is an HMAC over the booking id and guest email — no new table, and the link dies if
  either value changes.

### Abuse control

`POST /api/marketplace/listings/[id]/book` uses the `checkout` rate-limit preset keyed by
user id when present and client IP otherwise.

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Auto-create a shell `User` for guests | Creates unverified accounts and complicates sign-up/claiming; diverges from the guest-order pattern |
| Email OTP before holding a slot | Extra friction at the moment of purchase; slot is no longer held pre-payment, so the abuse ceiling is low |
| Keep the pre-payment hold and block the second buyer | Abandoned checkouts keep stranding vendor availability |
| Let both payers confirm | Vendor double-booked; pushes a money problem onto the vendor |
| Store a cancellation token column on `Booking` | Extra column and migration for something derivable from existing fields |

## Consequences

- Guest bookings earn no Pulse credit for the member (no account to credit); the vendor
  still earns theirs.
- Two buyers can pay for one slot; the loser's refund path must stay healthy, so
  `refundBookingPayment()` now keys off order payment status rather than booking status.
- The 24-hour window changes refund behavior for **signed-in members too**, superseding the
  "full refund on any cancel" rule in ADR-005.
