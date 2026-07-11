"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { PageBody } from "@/components/ui/PageBody";
import { sentryEnabled } from "@/lib/sentryOptions";

/**
 * Admin-only smoke test for Sentry. Protected by account/admin layout.
 */
export default function AdminSentryTestPage() {
  const [sent, setSent] = useState(false);
  const enabled = sentryEnabled();

  return (
    <PageBody description="Send a deliberate error to confirm production monitoring is wired.">
      <p className="text-sm text-fix-text-muted">
        {enabled
          ? "DSN is set — clicking below reports to your Sentry project."
          : "No NEXT_PUBLIC_SENTRY_DSN — the button still throws locally, but nothing is sent to Sentry."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setSent(true);
            Sentry.captureException(new Error("RootSync Sentry test error"));
          }}
        >
          Send test error
        </Button>
      </div>
      {sent ? (
        <p className="mt-4 text-sm text-brand-forest">
          Sent. Check Sentry → Issues for “RootSync Sentry test error” (usually under a minute).
        </p>
      ) : null}
      <p className="mt-8 text-xs text-fix-text-muted">
        <Link href="/account/admin" className="font-medium text-fix-link hover:text-fix-link-hover">
          Back to Admin overview
        </Link>
        {" · "}
        Setup notes in{" "}
        <code className="text-[0.7rem]">docs/SENTRY.md</code>
      </p>
    </PageBody>
  );
}
