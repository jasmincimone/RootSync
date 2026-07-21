# Deployment

## Environment Strategy

-   Local
-   Development
-   Staging
-   Production

## Deployment Checklist

-   Run tests (`npm run test:unit`)
-   Verify migrations (`prisma migrate deploy` / `build:vercel`)
-   Review environment variables (see `.env.example`)
-   Verify Stripe keys + webhook endpoint
-   Confirm `ENABLE_CONNECT_DEMO` is unset in production
-   Smoke test authentication
-   Smoke test payments (Connect destination charge + fee)
-   Verify email service
-   Follow [LAUNCH_SMOKE_CHECKLIST.md](./LAUNCH_SMOKE_CHECKLIST.md)
-   Money incidents: [MONEY_OPS_RUNBOOK.md](./MONEY_OPS_RUNBOOK.md)
-   Confirm Sentry DSN ([SENTRY.md](./SENTRY.md)) and send a test error from `/account/admin/sentry-test`
-   Monitor logs after deployment
