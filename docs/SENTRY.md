# Sentry (error monitoring)

Sentry watches RootSync in production and emails/alerts you when something breaks — failed checkouts, API crashes, blank pages — with a stack trace and (optionally) a replay of what the Member clicked.

It is **not** related to Stripe Connect fees or profit sharing. Your 10% platform fee stays as configured.

## What you get

| Feature | What it does |
|---------|----------------|
| **Issues** | Groups identical errors so you fix once |
| **Alerts** | Email/Slack when a new error spikes |
| **Traces** | Slow page/API timing (sampled) |
| **Session Replay** | Video-like replay **only when an error happens** (text/inputs masked) |

## One-time setup (you)

1. Create a free account at [sentry.io](https://sentry.io) → **Create project** → choose **Next.js**.
2. Copy the **DSN** (looks like `https://….ingest.sentry.io/…`).
3. In Vercel → Project → Settings → Environment Variables, add:

```bash
NEXT_PUBLIC_SENTRY_DSN="https://YOUR_KEY@oYOUR_ORG.ingest.sentry.io/YOUR_PROJECT"
```

Use the same value for Production (and Preview if you want staging errors).

4. Optional (readable stack traces on builds):

```bash
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"
SENTRY_AUTH_TOKEN="sntrys_…"   # Create under Sentry → Settings → Auth Tokens (project:releases)
```

5. Redeploy. Without a DSN, Sentry stays **off** and the app behaves as before.

## Verify

1. Deploy with `NEXT_PUBLIC_SENTRY_DSN` set.
2. As an admin, open `/account/admin/sentry-test` and click **Send test error**.
3. In Sentry → **Issues**, you should see `RootSync Sentry test error` within ~1 minute.

## Local

You can put `NEXT_PUBLIC_SENTRY_DSN` in `.env.local` to test locally. Omit it to keep local noise out of Sentry.
