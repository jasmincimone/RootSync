---
title: Service Bookings
version: 1.0
status: Active
owner: Jasmin Smith
last_updated: 2026-06-29
related:
  - adr/ADR-005-service-bookings.md
  - adr/ADR-009-guest-service-bookings.md
  - adr/ADR-003-calendar-abstraction.md
  - adr/ADR-004-offering-variants.md
  - 18_DOCS_CODE_ALIGNMENT.md
  - 16_ENGINEERING_HANDBOOK.md
---

# Service Bookings

Operational guide for the RootSync **service booking** capability — scheduling, payments, Google Meet, cancellation, and refunds.

---

## Member flow

1. Browse marketplace → service listing detail
2. Select **variant** (if multiple) → **Book now**
3. Sign in **or continue as a guest** → **calendar picker** → choose day + time
4. Intake questions (guests also give email + name) → **Continue to payment** (Stripe Checkout)
5. Confirmation page + email + Google Calendar invite with Meet link
6. **My bookings** (`/account/bookings`) — Meet link, cancel, reference IDs

## Guest bookings

Anyone can book without an account unless the vendor ticked **Require a RootSync account to
book** on that service listing. See ADR-009.

- Identity is the email they type — `Booking.memberUserId` is null, `memberEmail` is required
- Confirmation email links to `/bookings/[id]?token=…`, a signed link for viewing and cancelling
- Signing up later with the same email surfaces the booking in **My bookings** automatically
- Guest bookings earn no member Pulse credit; the vendor still earns theirs

## Vendor flow

1. Create **service** listing with availability, intake questions, fulfillment method (virtual/in-person/hybrid)
2. Optional **variants** (price + duration per option) — see ADR-004
3. Optionally **require an account to book** (off by default)
4. **Incoming appointments** (`/account/vendor/bookings`) — view member, Meet link, notes, mark completed, cancel

---

## Booking lifecycle

```
PENDING_PAYMENT  →  (Stripe paid)  →  CONFIRMED  →  COMPLETED
       │                    │              │
       └──── cancel ────────┴──── cancel ───┘
                    ↓
               CANCELLED
```

| Status | Meaning | Holds the slot? | Cancel? | Refund? |
|--------|---------|-----------------|---------|---------|
| `PENDING_PAYMENT` | Checkout started, not paid | **No** | Yes | N/A (no charge) |
| `CONFIRMED` | Paid + calendar synced | Yes | Yes | Full refund inside policy |
| `COMPLETED` | Vendor marked done | No | No | No |
| `CANCELLED` | Cancelled by member or vendor | No | No | Already refunded if owed |

Because only paid bookings hold a slot, two buyers can check out for the same time. The
first payment to confirm keeps it; `confirmPaidServiceBooking` refunds and cancels the
runner-up, then emails them a link back to the calendar.

---

## Key code paths

| Area | Location |
|------|----------|
| Slot generation | `src/lib/bookingSlots.ts` |
| Cancellation policy | `src/lib/bookingPolicy.ts` |
| Guest actor + guest links | `src/lib/bookingAccess.ts`, `src/lib/guestBookingLink.ts` |
| Checkout | `src/lib/bookingCheckout.ts` |
| Confirm (calendar + email) | `src/lib/confirmBooking.ts` |
| Refund on cancel | `src/lib/bookingRefund.ts` |
| Calendar abstraction | `src/services/calendar/` |
| Member UI | `src/components/ServiceBookingWizard.tsx`, `BookingCalendarPicker.tsx` |
| Guest manage page | `src/app/bookings/[id]/` |
| APIs | `src/app/api/marketplace/listings/[id]/book/`, `.../availability/` |
| Webhook | `src/app/api/webhooks/stripe/route.ts` → `confirmPaidServiceBooking` |
| Dev fallback | `src/app/api/bookings/confirm-from-session/route.ts` |

---

## Environment variables

See `.env.example`. Required for full booking experience:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout + refunds |
| `RESEND_API_KEY`, `EMAIL_FROM` | Confirmation & cancellation emails |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` (local) or `GOOGLE_SERVICE_ACCOUNT_JSON` (Vercel) | Calendar API |
| `GOOGLE_CALENDAR_ID` | Target calendar |
| `GOOGLE_CALENDAR_IMPERSONATE_USER` | Workspace user for Meet links (domain-wide delegation) |

---

## Local development

1. `npm run dev:3001`
2. Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
3. Without webhooks, the **checkout confirmation page** calls `confirm-from-session` after payment
4. Calendar POC: `npm run calendar:poc`
5. After schema changes: `npx prisma generate` + restart dev server

---

## Cancellation & refunds

**Policy:** self-serve cancellation refunds in full up to **24 hours** before the
appointment (`BOOKING_FREE_CANCELLATION_HOURS` in `src/lib/bookingPolicy.ts`). Inside that
window the booking is non-refundable, but the customer can message the vendor — a
**vendor-initiated cancellation always refunds in full**, whenever it happens.

**API:** `PATCH` with `{ "action": "cancel", "reason": "optional" }`

- Member: `/api/account/bookings/[id]`
- Vendor: `/api/vendor/bookings/[id]`
- Guest: `/api/bookings/[id]/guest-cancel` (same body plus `token`)

**Refund behavior (confirmed bookings, when a refund is owed):**

1. Resolve `payment_intent` from order or Checkout session
2. `stripe.refunds.create` with `reverse_transfer` + `refund_application_fee` when Connect destination charge
3. Order → `status: refunded`, `stripeRefundId`, `refundedAt`
4. If Stripe refund fails → booking **not** cancelled; error returned to UI

**Emails:** both parties notified; member sees refund amount and 5–10 business day note.

---

## Reference IDs

Cards show **Booking #XXXXXXXX** and **Order #XXXXXXXX** (last 8 chars of cuid). Hover for full ID. Member order # links to order history.

---

## Account navigation

| Section | Route | Audience |
|---------|-------|----------|
| My bookings | `/account/bookings` | Member — services you booked |
| Incoming appointments | `/account/vendor/bookings` | Approved vendor — customer bookings |
| Order history | `/account/orders` | Member — includes service booking orders |

Vendor menu group **Vendor services** appears only when `VendorProfile.status === APPROVED`.

---

## Deferred (not in MVP)

- Partial refunds (the 24-hour window is all-or-nothing)
- Reminder emails before appointment
- Subscription / recurring service billing
- Admin “reopen” completed booking
