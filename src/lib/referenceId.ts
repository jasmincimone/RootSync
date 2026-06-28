/** Last 8 characters of a cuid, uppercase — easy to read aloud or match in support. */
export function formatShortReference(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length <= 8) return trimmed.toUpperCase();
  return trimmed.slice(-8).toUpperCase();
}
