/** Contextual copy for the Pulse earned toast (Phase 6). */
export function pulseEarnedToastMessage(
  eventType: string,
  metadata?: Record<string, unknown> | null,
): string {
  switch (eventType) {
    case "PULSE_CREATED":
      return "Your Pulse post strengthened the community.";
    case "PULSE_RECEIVED":
      return "Someone gave Pulse to your contribution.";
    case "PROFILE_COMPLETED":
      return "Your profile is taking root.";
    case "LISTING_PUBLISHED":
      return "Your listing is live on Discover.";
    case "ORDER_VERIFIED":
      return "Your marketplace purchase strengthened the ecosystem.";
    case "BOOKING_COMPLETED":
      return metadata?.role === "vendor"
        ? "You hosted a meaningful consultation."
        : "You completed a consultation.";
    case "MESSAGE_SENT":
      return "You started a Stay Synced conversation.";
    case "DAILY_ACTIVITY":
      return "You showed up for your community today.";
    case "AI_GROW_PLAN_COMPLETED":
      return "You completed a RootSync AI growth plan.";
    case "VENDOR_REVIEW_GIVEN":
      return "Thanks for strengthening trust with your review.";
    case "VENDOR_PULSE_RECEIVED":
      return "A member gave Pulse to your work.";
    default:
      return "Every meaningful action strengthens your Pulse.";
  }
}

export type PulseEarnedPayload = {
  id: string;
  pulseValue: number;
  eventType: string;
  message: string;
};

export function toPulseEarnedPayload(
  event: { id: string; pulseValue: number; eventType: string },
  metadata?: Record<string, unknown> | null,
): PulseEarnedPayload {
  return {
    id: event.id,
    pulseValue: event.pulseValue,
    eventType: event.eventType,
    message: pulseEarnedToastMessage(event.eventType, metadata),
  };
}
