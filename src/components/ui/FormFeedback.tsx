/**
 * Standard success / error lines for form submissions.
 * Prefer one active message: clear the other in your handler when setting feedback.
 */
export function FormFeedback({
  success,
  error,
  className = "",
}: {
  success?: string | null;
  error?: string | null;
  className?: string;
}) {
  if (!success && !error) return null;
  return (
    <div className={`space-y-2 ${className}`.trim()} aria-live="polite">
      {success ? (
        <p className="text-sm text-forest" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
