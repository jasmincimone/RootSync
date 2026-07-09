/** Relative in-app path only — blocks open redirects via callbackUrl. */
export function safeCallbackPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw?.trim()) return fallback;
  try {
    const path = decodeURIComponent(raw.trim());
    if (path.startsWith("/") && !path.startsWith("//")) {
      return path;
    }
  } catch {
    /* invalid encoding */
  }
  return fallback;
}
