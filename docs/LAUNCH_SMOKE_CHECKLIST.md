# Launch smoke checklist (ops)

Run against **staging** first, then production. Check each box only after a real pass.

## Environment

- [ ] `NEXTAUTH_SECRET` set (no fallback)
- [ ] `DATABASE_URL` + `DIRECT_URL` (Neon pooled/direct)
- [ ] `STRIPE_SECRET_KEY` / publishable / `STRIPE_WEBHOOK_SECRET` (test then live)
- [ ] `STRIPE_PLATFORM_FEE_BPS` set intentionally (default 1000 = 10%)
- [ ] `RESEND_API_KEY` + `EMAIL_FROM`
- [ ] `BLOB_READ_WRITE_TOKEN` (Resources + listing images on Vercel)
- [ ] Google Calendar / Meet vars for service bookings
- [ ] `ENABLE_CONNECT_DEMO` **unset** in production
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in production (see [SENTRY.md](./SENTRY.md))
- [ ] Build command uses `npm run build:vercel` (migrate deploy)

## Auth

- [ ] Signup → email OTP consent → login with OTP
- [ ] Password reset email arrives
- [ ] Login `callbackUrl` rejects `https://evil.example` (stays on-site)
- [ ] Rate limit: rapid login-prepare returns 429

## Commerce (Connect)

- [ ] Approved vendor completes Payment Hub onboarding (`readyToProcessPayments`)
- [ ] Listing Buy now creates Checkout with destination charge
- [ ] Stripe Dashboard: connected account receives ~90% (or configured share), platform fee present
- [ ] Vendor without Connect + without payment link: Buy now unavailable (honest message)
- [ ] Payment link-only listing still works via Pay Link / Buy now link

## Bookings

- [ ] Book service → pay → confirmation shows Meet link
- [ ] Cancel before start → refund with reverse_transfer

## Resources

- [ ] Paid Resource: signed-in buyer can download
- [ ] Anonymous `/api/download` → 401
- [ ] Other Member cannot download someone else’s order

## Discover honesty

- [ ] Event cards say **Get tickets** (detail supports ticket tiers + checkout)
- [ ] Paid Google Meet event: confirmation page + email include Meet link
- [ ] Paid external-link event: confirmation + email include event space URL
- [ ] GrowSpace hub copy says coming soon; module nav limited to Overview
- [ ] External Pay Link copy notes off-platform (no RootSync fee)

## Observability

- [ ] Admin opens `/account/admin/sentry-test` → **Send test error** → appears in Sentry Issues
- [ ] Stripe webhook deliveries succeed for `checkout.session.completed`
