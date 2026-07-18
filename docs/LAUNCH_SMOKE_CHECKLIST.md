# Launch smoke checklist (ops)

Run against **staging** first, then production. Check each box only after a real pass.

**Local pass (2026-07-17):** env keys present in `.env.local` (except `DIRECT_URL` + intentional unset of `ENABLE_CONNECT_DEMO` / unset fee default), pillar routes 200, Discover honesty UI reachable, legacy redirects verified below.

**Staging (2026-07-18):** Preview deployed with Must work:  
https://the-fix-collective-2zb5oq8v9-jasmincimones-projects.vercel.app  
Inspect: https://vercel.com/jasmincimones-projects/the-fix-collective/A31HK5xT4QNuyU5N1J3EuxB4kpot  

Blocked for unattended smoke: Vercel Deployment Protection (SSO) on all non-custom-domain previews. Production (`rootsync.io`) is still **v0.1.50** (7d old) and does **not** include Musts until promote. Neon schema is up to date (34 migrations).

## Environment

- [x] `NEXTAUTH_SECRET` set (no fallback) — local + Vercel Preview/Production
- [x] `DATABASE_URL` set — local + Vercel
- [x] `DIRECT_URL` set (Neon direct / non-pooler) — **Vercel Preview/Production** (still missing locally)
- [x] `STRIPE_SECRET_KEY` / publishable / `STRIPE_WEBHOOK_SECRET` — local + Vercel (confirm test vs live keys per env)
- [ ] `STRIPE_PLATFORM_FEE_BPS` set intentionally — **not set on Vercel** (code default 1000 = 10%; set explicitly if you want a different take-rate)
- [x] `RESEND_API_KEY` + `EMAIL_FROM` — local + Vercel
- [x] `BLOB_READ_WRITE_TOKEN` — local + Vercel
- [x] Google Calendar / Meet vars for service bookings — **on Vercel** (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CALENDAR_IMPERSONATE_USER`)
- [x] `ENABLE_CONNECT_DEMO` **unset** in production — unset on Vercel (good)
- [x] `NEXT_PUBLIC_SENTRY_DSN` set — local + Vercel
- [x] Build command uses `npm run build:vercel` (migrate deploy) — **set on Vercel project 2026-07-18**
- [ ] Staging env mirror of production secrets (test Stripe + live Stripe separately) — Preview currently shares Production env vars (same Neon + same Stripe). Split later if you want safer commerce smoke.

## Auth

- [ ] Signup → email OTP consent → login with OTP — **needs browser on Preview (SSO) or after promote**
- [ ] Password reset email arrives — **needs browser + Resend inbox check**
- [x] Login `callbackUrl` rejects `https://evil.example` (stays on-site) — code uses `safeCallbackPath` (client falls back to `/account`)
- [ ] Rate limit: rapid login-prepare returns 429 — **blocked on Preview by SSO; retest after open access**

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
- [ ] Anonymous `/api/download` → 401 (with `orderId` + `itemId`)
- [ ] Other Member cannot download someone else’s order

## Discover honesty

- [x] Verified Vendor badge explains that RootSync reviewed and approved the Vendor — local UI (reconfirm on Preview/prod after open access)
- [ ] Directory owner requests a claim → request appears in Admin → Vendor approval required before claim approval
- [x] Event cards say **Get tickets** (detail supports ticket tiers + checkout) — local UI
- [ ] Paid external event-space URL is hidden before purchase
- [ ] Event capacity rejects checkout when sold out
- [ ] Paid Google Meet event: confirmation page + email include Meet link
- [ ] Paid external-link event: confirmation + email include event space URL
- [ ] Active/Scheduled Resource cannot publish without a delivery file
- [x] GrowSpace shows Overview · CRM · Funnels · Campaigns only (no Coming soon modules in nav) — local UI
- [ ] External Pay Link copy notes off-platform (no RootSync fee)

## Legacy links (keep — Fix Collective / shared URLs)

Do **not** remove these redirects. Pitch or not, old shop and platform URLs still need to land correctly.

- [x] `/shops` → `/discover`
- [x] `/shops/urban-roots` → Urban Roots vendor (`/discover/vendors/thefixurbanroots`)
- [x] `/shops/self-care` → Self-Care vendor storefront
- [x] `/shops/stitch` → Stitch vendor storefront
- [x] `/shops/survival-kits` → Survival Kits vendor storefront
- [x] `/shops/[slug]/products` → that vendor’s listings anchor
- [x] `/marketplace` → `/discover`
- [x] `/downloads` → `/discover?type=RESOURCE`
- [x] `/courses` → `/discover?type=EVENT`
- [x] `/community` → `/pulse`
- [x] `/rootsyncai` → `/rootsense-ai`
- [x] `/account/community` → `/account/pulses`

**Note:** Production still blanket-redirects `/shops/*` → `/discover` until this Preview is promoted. Preview includes the fixed per-slug vendor redirects.

## Observability

- [ ] Admin opens `/account/admin/sentry-test` → **Send test error** → appears in Sentry Issues
- [ ] Stripe webhook deliveries succeed for `checkout.session.completed`
