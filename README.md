# RootSync

Local-living platform: **Discover Marketplace**, **Pulse**, **Stay Synced**, and **RootSense AI**.

Live site: [https://rootsync.io](https://rootsync.io)

## Quick start

```bash
nvm use        # Node >= 20.9 (see .nvmrc)
npm install
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_*, Stripe test keys, etc.
npm run db:migrate
npm run dev:3001
```

Open `http://localhost:3001` (or `npm run dev` for port 3000). Set `NEXTAUTH_URL` to match the port.

## What this product is

| Area | Route | Notes |
|------|--------|--------|
| Discover | `/discover` | Vendors, listings, directory, map |
| Pulse | `/pulse` | Community feed |
| Stay Synced | `/messages/inbox` | Messaging |
| RootSense AI | `/rootsense-ai` | Rootie chat |
| Account | `/account` | Member / Vendor / GrowSpace / Admin hubs |

Members buy and book through **Stripe Connect** (destination charges + platform fee). Vendors onboard in **Payment Hub**. Details: [docs/](./docs/README.md).

## Day-one reading (humans & AI)

1. [docs/ROOTSYNC_CONSTITUTION.md](./docs/ROOTSYNC_CONSTITUTION.md)  
2. [docs/ROOTSYNC_PRODUCT_BIBLE.md](./docs/ROOTSYNC_PRODUCT_BIBLE.md)  
3. [docs/17_GLOSSARY.md](./docs/17_GLOSSARY.md)  
4. [docs/16_ENGINEERING_HANDBOOK.md](./docs/16_ENGINEERING_HANDBOOK.md)  
5. [docs/MONEY_OPS_RUNBOOK.md](./docs/MONEY_OPS_RUNBOOK.md) — payments stuck, webhooks, refunds  

## Common scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` / `dev:3001` | Local Next.js |
| `npm run build:vercel` | `prisma migrate deploy` + production build (Vercel Build Command) |
| `npm run typecheck` / `lint` | Gates used in CI |
| `npm run test:unit` | Unit tests (fees, auth, callbacks, checkout helpers, bookings slots, offerings, calendar) |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:set-user-role -- you@example.com ADMIN` | First admin |

Keep `prisma/.env` `DATABASE_URL` aligned with `.env.local` for Prisma CLI.

## Environment

Copy [.env.example](./.env.example). Minimum for local:

- `DATABASE_URL` + `DIRECT_URL` (Neon: pooled + direct)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Stripe **test** keys + `STRIPE_WEBHOOK_SECRET` (`stripe listen --forward-to localhost:3001/api/webhooks/stripe`)
- `RESEND_API_KEY` + `EMAIL_FROM` for real email (OTP / reset)
- `BLOB_READ_WRITE_TOKEN` for listing/resource uploads

Never mix live and test Stripe accounts/keys.

## Roles

1. Sign up at `/signup` (default: Member).  
2. First admin: `npm run db:set-user-role -- you@example.com ADMIN`.  
3. Vendors: **Account → Become a Vendor** → admin approves → Payment Hub → listings.  
4. GrowSpace (CRM / funnels / campaigns) is for approved vendors (+ admins).

## Blank page / port in use

```bash
rm -rf .next && npm run dev:3001
```

If port 3000 is busy, use `dev:3001` and match `NEXTAUTH_URL`. Clear cookies after changing `NEXTAUTH_SECRET` or URL.

## Deploy

- Host: **Vercel**; DB: **Neon** (or compatible Postgres).  
- Build command: `npm run build:vercel`.  
- Checklist: [docs/13_DEPLOYMENT.md](./docs/13_DEPLOYMENT.md) and [docs/LAUNCH_SMOKE_CHECKLIST.md](./docs/LAUNCH_SMOKE_CHECKLIST.md).  
- Stripe webhook: `https://your-domain.com/api/webhooks/stripe`.  
- Money incidents: [docs/MONEY_OPS_RUNBOOK.md](./docs/MONEY_OPS_RUNBOOK.md).

## CI

On push/PR: `prisma generate` → typecheck → lint → `npm run test:unit`.
