export type AppointmentAttendee = {
  email: string;
  displayName?: string;
};

export type CreateAppointmentInput = {
  calendarId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone?: string;
  location?: string;
  attendees?: AppointmentAttendee[];
  /** When true, request a Google Meet link via conferenceData (virtual services). */
  includeMeetLink?: boolean;
  /** Idempotency key for Meet conference creation (auto-generated if omitted). */
  meetRequestId?: string;
};

export type UpdateAppointmentInput = {
  calendarId: string;
  eventId: string;
  title?: string;
  description?: string;
  startAt?: Date;
  endAt?: Date;
  timeZone?: string;
  location?: string;
  attendees?: AppointmentAttendee[];
  includeMeetLink?: boolean;
  meetRequestId?: string;
};

export type CancelAppointmentInput = {
  calendarId: string;
  eventId: string;
  /** Optional note appended to the event description when cancelling. */
  reason?: string;
  /** When true, email calendar attendees about the cancellation. */
  notifyAttendees?: boolean;
};

export type DeleteAppointmentInput = {
  calendarId: string;
  eventId: string;
};

export type CreateMeetLinkInput = {
  calendarId: string;
  eventId: string;
  meetRequestId?: string;
};

export type CalendarAppointment = {
  provider: string;
  calendarId: string;
  eventId: string;
  htmlLink?: string;
  meetLink?: string;
  status?: string;
};

export type GoogleServiceAccountKey = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  universe_domain?: string;
};
