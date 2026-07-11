import * as Sentry from "@sentry/nextjs";

import { sentryDsn, sentryEnabled, sentryTracesSampleRate } from "@/lib/sentryOptions";

Sentry.init({
  dsn: sentryDsn(),
  enabled: sentryEnabled(),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: sentryTracesSampleRate(),
});
