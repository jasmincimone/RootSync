"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { isChunkLoadError } from "@/lib/chunkLoadError";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkFailed = isChunkLoadError(error.message);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-fix-heading">
        {chunkFailed ? "App update" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-sm text-fix-text-muted">
        {chunkFailed
          ? "The page tried to load an outdated script bundle (often after a dev hot reload). Reload the page to fetch the latest code."
          : error.message ||
            "An unexpected error occurred. Check the browser console for details."}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {chunkFailed ? (
          <Button type="button" variant="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        ) : null}
        <Button type="button" variant={chunkFailed ? "secondary" : "primary"} onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
