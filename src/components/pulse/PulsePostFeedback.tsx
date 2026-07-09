import type { PulsePostApiError } from "@/lib/pulsePostValidation";

type Props = {
  success?: string | null;
  error?: PulsePostApiError | string | null;
  className?: string;
};

function normalizeError(error: Props["error"]): PulsePostApiError | null {
  if (!error) return null;
  if (typeof error === "string") return { error };
  return error;
}

export function PulsePostFeedback({ success, error, className = "" }: Props) {
  const err = normalizeError(error);
  if (!success && !err) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()} aria-live="polite">
      {success ? (
        <p className="text-sm text-forest" role="status">
          {success}
        </p>
      ) : null}
      {err ? (
        <div className="rounded-lg border border-bark/25 bg-bark/5 px-3 py-2.5" role="alert">
          <p className="text-sm font-medium text-bark">{err.error}</p>
          {err.hint ? <p className="mt-1 text-sm text-fix-text-muted">{err.hint}</p> : null}
          {err.details && err.details.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-fix-text-muted">
              {err.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {err.code ? (
            <p className="mt-2 text-[10px] uppercase tracking-wide text-fix-text-muted">
              Error code: {err.code}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function pulsePostErrorFromResponse(data: unknown, fallback: string): PulsePostApiError {
  if (!data || typeof data !== "object") return { error: fallback };
  const row = data as Record<string, unknown>;
  return {
    error: typeof row.error === "string" ? row.error : fallback,
    hint: typeof row.hint === "string" ? row.hint : undefined,
    code: typeof row.code === "string" ? (row.code as PulsePostApiError["code"]) : undefined,
    details: Array.isArray(row.details)
      ? row.details.filter((d): d is string => typeof d === "string")
      : undefined,
  };
}
