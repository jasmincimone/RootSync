/** Human-readable labels for Pulse Events in workspace UI. */
export function pulseEventLabel(
  eventType: string,
  metadata?: Record<string, unknown> | null,
): string {
  const role = metadata?.role;

  switch (eventType) {
    case "PULSE_CREATED":
      return "Published a Pulse";
    case "PULSE_RECEIVED":
      return "Received a Pulse";
    case "PROFILE_COMPLETED":
      return "Completed your profile";
    case "LISTING_PUBLISHED":
      return "Published a listing";
    case "ORDER_VERIFIED":
      return "Verified marketplace purchase";
    case "BOOKING_COMPLETED":
      return role === "vendor" ? "Hosted a consultation" : "Completed a consultation";
    case "MESSAGE_SENT":
      return "Started a Stay Synced conversation";
    case "DAILY_ACTIVITY":
      return "Active in the ecosystem";
    case "AI_GROW_PLAN_COMPLETED":
      return "Completed a RootSync AI plan";
    case "VENDOR_REVIEW_GIVEN":
      return "Gave a vendor Pulse review";
    case "VENDOR_PULSE_RECEIVED":
      return "Received a Pulse review";
    default:
      return eventType.replace(/_/g, " ").toLowerCase();
  }
}

export function formatPulseRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
