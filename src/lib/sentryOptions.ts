/**
 * Shared Sentry options for browser, Node, and Edge.
 * DSN is public (write-only to your project). Leave unset to disable monitoring.
 */
export function sentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim() || undefined;
}

export function sentryEnabled(): boolean {
  return Boolean(sentryDsn());
}

export function sentryTracesSampleRate(): number {
  if (process.env.NODE_ENV === "development") return 1.0;
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  return 0.1;
}
