import * as Sentry from "@sentry/nextjs";

import { sentryDsn, sentryEnabled, sentryTracesSampleRate } from "@/lib/sentryOptions";

Sentry.init({
  dsn: sentryDsn(),
  enabled: sentryEnabled(),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: sentryTracesSampleRate(),
  // Replay only on errors; mask PII by default (Member emails, checkout fields).
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: sentryEnabled() ? 1.0 : 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
