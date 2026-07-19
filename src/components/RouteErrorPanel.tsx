"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { isChunkLoadError } from "@/lib/chunkLoadError";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

/** Shared segment error UI — ErrorBanner + retry (and reload for chunk misses). */
export function RouteErrorPanel({ error, reset, title = "Something went wrong" }: Props) {
  const chunkFailed = isChunkLoadError(error.message);

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-lg font-semibold text-fix-heading">{title}</h1>
      <div className="mt-4">
        <ErrorBanner
          message={
            chunkFailed
              ? "The page tried to load an outdated script. Reload to fetch the latest code."
              : error.message || "An unexpected error occurred. Try again."
          }
          onRetry={chunkFailed ? () => window.location.reload() : reset}
          retryLabel={chunkFailed ? "Reload page" : "Try again"}
        />
      </div>
    </div>
  );
}
