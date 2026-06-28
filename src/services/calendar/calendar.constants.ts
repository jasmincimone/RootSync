/** Google Calendar API OAuth scope for creating and managing events. */
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export const CALENDAR_PROVIDER = {
  GOOGLE: "google",
} as const;

export type CalendarProviderId = (typeof CALENDAR_PROVIDER)[keyof typeof CALENDAR_PROVIDER];

/** Default IANA timezone when none is specified on an appointment. */
export const DEFAULT_CALENDAR_TIMEZONE = "America/New_York";

/** Google Meet conference solution key for Calendar API conferenceData. */
export const GOOGLE_MEET_CONFERENCE_TYPE = "hangoutsMeet";
