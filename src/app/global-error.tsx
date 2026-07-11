"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { isChunkLoadError } from "@/lib/chunkLoadError";

/**
 * Catches errors in the root layout. Must define its own <html> and <body>.
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const chunkFailed = isChunkLoadError(error.message);
  const btn = {
    marginTop: "0.75rem",
    padding: "0.5rem 1.25rem",
    borderRadius: "9999px",
    border: "none",
    background: "#044730",
    color: "#e1cec3",
    cursor: "pointer",
    fontSize: "0.875rem",
  } as const;

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#e1cec3", color: "#342a0f" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          {chunkFailed ? "App update" : "Something went wrong"}
        </h1>
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", opacity: 0.85 }}>
          {chunkFailed
            ? "The page tried to load an outdated script bundle. Reload to fetch the latest code."
            : error.message || "Check the terminal where `npm run dev` is running for details."}
        </p>
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
          {chunkFailed ? (
            <button type="button" onClick={() => window.location.reload()} style={btn}>
              Reload page
            </button>
          ) : null}
          <button type="button" onClick={() => reset()} style={chunkFailed ? { ...btn, background: "transparent", color: "#342a0f", border: "1px solid rgba(52,42,15,0.35)" } : btn}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
