# Launch smoke checklist (ops)

Run against **staging** first, then production. Check each box only after a real pass.

**Local pass (2026-07-17):** env + pillar routes + legacy redirects.

**Production pass (2026-07-18):** `v0.1.53` live on https://rootsync.io  
Deploy: https://the-fix-collective-raew1lizc-jasmincimones-projects.vercel.app (`dpl_H42TtvrBZRNDVkHMKKEtiQZZkQxh`)

Core public + signed-in commerce/auth items are checked. Unchecked boxes below are optional leftovers (or blocked until Resource listings exist).

## Environment

- [x] `NEXTAUTH_SECRET` set (no fallback) — Vercel Production
- [x] `DATABASE_URL` set — Vercel Production
- [x] `DIRECT_URL` set (Neon direct / non-pooler) — Vercel Production
- [x] `STRIPE_SECRET_KEY` / publishable / `STRIPE_WEBHOOK_SECRET` — Vercel Production (confirm live vs test in Dashboard)
- [ ] `STRIPE_PLATFORM_FEE_BPS` set intentionally — **unset** (code default **1000 = 10%**); set only if you want a different take-rate
- [x] `RESEND_API_KEY` + `EMAIL_FROM` — Vercel Production
- [x] `BLOB_READ_WRITE_TOKEN` — Vercel Production
- [x] Google Calendar / Meet vars — Vercel Production
- [x] `ENABLE_CONNECT_DEMO` **unset** in production
- [x] `NEXT_PUBLIC_SENTRY_DSN` set — Vercel Production
- [x] Build command uses `npm run build:vercel` — set on project 2026-07-18; prod deploy from `main` succeeded
- [ ] Staging env mirror of production secrets (test Stripe + live Stripe separately) — Preview shares Production env today (optional later)

## Auth

- [x] Signup → email OTP consent → login with OTP — **confirmed by operator 2026-07-18**
- [ ] Password reset email arrives — optional leftover
- [x] Login `callbackUrl` rejects `https://evil.example` (stays on-site) — `safeCallbackPath`
- [x] Rate limit: rapid login-prepare returns 429 — **passed on production** (429 after ~20 attempts)

## Commerce (Connect)

- [x] Approved vendor completes Payment Hub onboarding (`readyToProcessPayments`) — **confirmed (Urban Roots)**
- [x] Listing Buy now creates Checkout with destination charge — **confirmed (Test Consultation)**
- [x] Stripe Dashboard: connected account + ~10% application fee — **confirmed** ($0.09 fee on $0.96; Stripe card fee ~$0.33 is separate)
- [x] Vendor without Connect + without payment link: Buy now unavailable (honest message)
- [ ] Payment link-only listing still works via Pay Link / Buy now link — optional

## Bookings

- [x] Book service → pay → confirmation/email shows Meet link — **confirmed**
- [ ] Cancel before start → refund with reverse_transfer — optional retest

## Resources

- [ ] Paid Resource: signed-in buyer can download — when a paid Resource listing exists
- [ ] Free Resource ($0): signed-in Member can claim download without Stripe — when a free Resource exists
- [x] Anonymous `/api/download` → 401 — **passed**
- [ ] Other Member cannot download someone else’s order — after first Resource claim/sale
- [ ] Active/Scheduled Resource cannot publish without a delivery file — when Resources are added

## Discover honesty

- [x] Verified Vendor badge explains RootSync reviewed/approved
- [x] Directory claim request + admin reject/approve — **confirmed**; Vendor hub shows Pending / Approved / Denied
- [x] Events ticket flow — **confirmed by operator**
- [x] Paid Google Meet confirmation/email include Meet link — **confirmed**
- [x] GrowSpace shows Overview · CRM · Funnels · Campaigns only
- [ ] External Pay Link copy notes off-platform (no RootSync fee) — optional


## Legacy links (keep — Fix Collective / shared URLs)

- [x] `/shops` → `/discover`
- [x] `/shops/urban-roots` → `/discover/vendors/thefixurbanroots`
- [x] `/shops/self-care` → Self-Care vendor
- [x] `/shops/stitch` → Stitch vendor
- [x] `/shops/survival-kits` → Survival Kits vendor
- [x] `/shops/[slug]/products` → vendor listings anchor
- [x] `/marketplace` → `/discover`
- [x] `/downloads` → `/discover?type=RESOURCE`
- [x] `/courses` → `/discover?type=EVENT`
- [x] `/community` → `/pulse`
- [x] `/rootsyncai` → `/rootsense-ai`
- [x] `/account/community` → `/account/pulses`

Also verified on production: home hero includes **Make local living easier** + all four pillars; `/api/favorites` returns 401 when signed out.

## Observability

- [x] Admin opens `/account/admin/sentry-test` → **Send test error** → appears in Sentry Issues — **confirmed**
- [ ] Stripe webhook deliveries succeed for `checkout.session.completed` — confirm in Stripe Dashboard (likely ok given successful Connect payment)
