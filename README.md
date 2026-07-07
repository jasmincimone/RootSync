# RootSync

Modern, scalable ecommerce + community platform with four shops under one brand:

- The Fix Urban Roots
- The Fix Self-Care
- The Fix Stitch
- The Fix Survival Kits

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Node version

This repo requires Node `>=20.9.0` (see `.nvmrc`).

Recommended local setup:

```bash
nvm install 20
nvm use 20
node -v
```

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build (Next.js only)
- `npm run build:vercel`: `prisma migrate deploy` + production build (use this as the Vercel **Build Command**, or run `prisma migrate deploy` separately before build)
- `npm run start`: start production server
- `npm run db:generate`: generate Prisma client
- `npm run db:migrate`: run database migrations
- `npm run db:push`: push schema to DB (dev)
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript typechecking

## Payments and account

The app uses **Stripe** for payments and **NextAuth** for accounts.

1. Copy `.env.example` to `.env.local` and set:
   - `DATABASE_URL` — **PostgreSQL** (local Docker, [Neon](https://neon.tech), Supabase, etc.). Align `prisma/.env` with the same URL for Prisma CLI.
   - `NEXTAUTH_URL` (e.g. `http://localhost:3000`) and `NEXTAUTH_SECRET`
   - Stripe keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - For webhooks: `STRIPE_WEBHOOK_SECRET` (use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` to get it)

2. Run migrations: `npm run db:migrate` (creates/updates tables; requires `DATABASE_URL`).

3. **Email (Resend)** — required for **forgot password** and **email two-factor** to actually send mail. See [Email with Resend](#email-with-resend) below. Without `RESEND_API_KEY` + `EMAIL_FROM`, dev still works but reset links are only logged in the terminal.

4. Create an account at `/signup`, then sign in at `/login`. Order history and purchased resources are under **Account** (header) → **Order history**.

5. **Roles (admin / vendor / customer)**  
   - New signups are **customers** by default.  
   - **First admin:** after creating your account, promote your user:  
     `npm run db:set-user-role -- you@example.com ADMIN`  
     (or use `npx prisma studio` and edit `User.role`.)  
   - **Vendors:** customers can apply at **Account → Become a vendor**. An admin approves under **Account → Admin → Vendor requests**. Approved vendors get marketplace listing tools and a **Vendor** badge in **Community** (when posting).  
   - Admins can change roles under **Account → Admin → Users & roles**.

6. **Resources:** vendors upload delivery files on the listing form. Files up to 4 MB use server upload; larger files (to 100 MB) upload directly to Vercel Blob from the browser. Requires `BLOB_READ_WRITE_TOKEN`. After payment, buyers access files from **Order history** via the secure download API.

## Stripe Payment Links (simple checkout)

Each product can use a **Stripe Payment Link** (one price per link, created in the [Stripe Dashboard](https://dashboard.stripe.com/payment-links)):

- Add URLs in **`src/config/paymentLinks.ts`** as `productId: "https://buy.stripe.com/..."`, **or**
- Set `stripePaymentLink` on a catalog listing in **Admin → Platform shops** (stored in the database).

When set, product cards and product pages show **Buy now** (opens the link) plus **Add to cart** for combining multiple items. Multi-item carts still use **Cart → Proceed to payment** (Checkout Session).

## Blank page / nothing loads

1. **Stop the dev server**, delete the Next cache, start again:
   ```bash
   rm -rf .next && npm run dev
   ```
2. **Confirm `.env.local`** matches `.env.example` (especially `NEXTAUTH_URL=http://localhost:3000` and a real `NEXTAUTH_SECRET`). A typo or stray quote can break all env loading.
3. **If you changed `NEXTAUTH_SECRET`**, old session cookies no longer match. Clear site data for `localhost` in the browser (or use a private/incognito window), then reload.
4. Check the **terminal** where `npm run dev` runs and the browser **Console** (F12 → Console) for red errors.

## Port already in use (`EADDRINUSE :::3000`)

Another process (often a previous `npm run dev`) is still using port 3000. Either stop that process, or start on another port:

```bash
npm run dev:3001
```

Then open `http://localhost:3001` and set `NEXTAUTH_URL` to match (e.g. `http://localhost:3001`).

## Database / Prisma errors

If pages that use the database show errors or the community feed is empty with a “migrations” message:

1. Ensure **`DATABASE_URL`** in `.env.local` points at **PostgreSQL** (see `.env.example`).
2. Apply the schema:

```bash
npm run db:migrate
```

3. If you see `prisma: command not found`, use one of these instead:

```bash
npm run db:migrate
npx prisma migrate dev
```

4. Keep `prisma/.env` aligned with `.env.local` for CLI commands (`migrate`, `generate`, `studio`).
5. Regenerate Prisma client after dependency/env changes:

```bash
npx prisma generate
```

6. Quick DB connectivity check:

```bash
npx prisma migrate status
```

## Local Stripe + Auth gotchas (test mode)

If local login keeps redirecting to production, or Connect account creation fails unexpectedly:

1. In local `.env.local`, set:
   - `NEXTAUTH_URL="http://localhost:3001"` (if running `npm run dev:3001`)
   - test Stripe keys (`sk_test...` + `pk_test...`)
2. Restart dev server after env changes.
3. Clear browser cookies/site data (or use incognito) after changing `NEXTAUTH_URL` or auth secrets.
4. Do **not** mix live/test Stripe resources:
   - test keys cannot read live `acct_...`
   - live keys cannot read test `acct_...`
5. If a user is linked to an inaccessible/stale `stripeConnectAccountId`, clear mapping in Connect demo (dev) and create a fresh test connected account.

## Deploy (Vercel + PostgreSQL + custom domain)

1. **Create Postgres** (pick one):
   - **Vercel Postgres** (Storage → Create → Postgres) in your Vercel project, or  
   - **Neon** / **Supabase** — copy the connection string (use **`?sslmode=require`** if the provider says so).

2. **Import the GitHub repo** in Vercel → New Project → select `TheFixCollective`.

3. **Environment variables** (Vercel → Project → Settings → Environment Variables), for **Production** (and Preview if you want):
   - `DATABASE_URL` — Postgres URL from step 1 (Neon: use the **pooled** connection string)  
   - `DIRECT_URL` — Neon **direct** connection (host without `-pooler`); required for `prisma migrate deploy` during build  
   - `NEXTAUTH_URL` — `https://your-domain.com` (no trailing slash)  
   - `NEXTAUTH_SECRET` — long random string (e.g. `openssl rand -base64 32`)  
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`  
   - `OPENAI_API_KEY` (RootSync), optional `OPENAI_MODEL`  
   - Optional: `GEOCODE_USER_AGENT` for geocoding  

4. **Build command** (Vercel → Settings → General → Build & Development Settings):  
   `npm run build:vercel`  
   Or keep default `npm run build` and add a **Deploy Hook** / separate step that runs `npx prisma migrate deploy` before build — the repo’s `build:vercel` runs migrations then builds.

5. **Squarespace domain DNS** (Squarespace → Domains → your domain → **DNS Settings**):
   - In **Vercel** → Project → **Settings → Domains**: add `yourdomain.com` and `www.yourdomain.com`. Vercel shows the records to create.
   - Usually you’ll add:
     - **`A`** record for `@` → Vercel’s IP (shown in the UI), or use their recommended **A**/`ALIAS` setup, and  
     - **`CNAME`** for `www` → `cname.vercel-dns.com` (exact value from Vercel).  
   - Remove or disable old **Lovable** / previous host records that conflict (same `Host`/`Name`).

6. After deploy: run **`npm run db:set-user-role -- you@example.com ADMIN`** against production only if you need a first admin (use Vercel CLI env, or Prisma Studio with prod `DATABASE_URL`), or promote via the app once one admin exists.

7. **Stripe webhooks**: point the endpoint to `https://your-domain.com/api/webhooks/stripe` and update the signing secret in Vercel env.

