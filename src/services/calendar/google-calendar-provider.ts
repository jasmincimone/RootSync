import { randomUUID } from "node:crypto";

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

import {
  CALENDAR_PROVIDER,
  DEFAULT_CALENDAR_TIMEZONE,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_MEET_CONFERENCE_TYPE,
} from "@/services/calendar/calendar.constants";
import type { CalendarProvider } from "@/services/calendar/calendar-provider";
import type {
  CalendarAppointment,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreateMeetLinkInput,
  DeleteAppointmentInput,
  GoogleServiceAccountKey,
  UpdateAppointmentInput,
} from "@/services/calendar/calendar.types";
import {
  getGoogleCalendarImpersonateUser,
  loadGoogleServiceAccountCredentials,
} from "@/services/calendar/google-credentials";
import { formatGoogleCalendarDateTime } from "@/lib/timezone";

function extractMeetLink(event: calendar_v3.Schema$Event): string | undefined {
  const video = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  return video?.uri ?? event.hangoutLink ?? undefined;
}

function toAppointment(
  calendarId: string,
  event: calendar_v3.Schema$Event,
): CalendarAppointment {
  return {
    provider: CALENDAR_PROVIDER.GOOGLE,
    calendarId,
    eventId: event.id!,
    htmlLink: event.htmlLink ?? undefined,
    meetLink: extractMeetLink(event),
    status: event.status ?? undefined,
  };
}

function buildConferenceData(requestId: string): calendar_v3.Schema$ConferenceData {
  return {
    createRequest: {
      requestId,
      conferenceSolutionKey: { type: GOOGLE_MEET_CONFERENCE_TYPE },
    },
  };
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly id = CALENDAR_PROVIDER.GOOGLE;

  private readonly credentials: GoogleServiceAccountKey;
  private calendarClient: ReturnType<typeof google.calendar> | null = null;

  constructor(credentials?: GoogleServiceAccountKey) {
    this.credentials = credentials ?? loadGoogleServiceAccountCredentials();
  }

  private getClient() {
    if (!this.calendarClient) {
      const impersonate = getGoogleCalendarImpersonateUser();
      const auth = new google.auth.JWT({
        email: this.credentials.client_email,
        key: this.credentials.private_key,
        scopes: [GOOGLE_CALENDAR_SCOPE],
        ...(impersonate ? { subject: impersonate } : {}),
      });
      this.calendarClient = google.calendar({ version: "v3", auth });
    }
    return this.calendarClient;
  }

  private assertMeetPrerequisites() {
    if (!getGoogleCalendarImpersonateUser()) {
      throw new Error(
        "GOOGLE_CALENDAR_IMPERSONATE_USER is required to create Google Meet links. " +
          "Set it to a Workspace user (e.g. thefixurbanroots@rootsync.io) with domain-wide delegation enabled.",
      );
    }
  }

  async createAppointment(input: CreateAppointmentInput): Promise<CalendarAppointment> {
    if (input.includeMeetLink) {
      this.assertMeetPrerequisites();
    }
    const client = this.getClient();
    const timeZone = input.timeZone ?? DEFAULT_CALENDAR_TIMEZONE;
    const requestId = input.meetRequestId ?? randomUUID();

    const requestBody: calendar_v3.Schema$Event = {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: formatGoogleCalendarDateTime(input.startAt, timeZone), timeZone },
      end: { dateTime: formatGoogleCalendarDateTime(input.endAt, timeZone), timeZone },
      attendees: input.attendees?.map((a) => ({
        email: a.email,
        displayName: a.displayName,
      })),
    };

    if (input.includeMeetLink) {
      requestBody.conferenceData = buildConferenceData(requestId);
    }

    const response = await client.events.insert({
      calendarId: input.calendarId,
      conferenceDataVersion: input.includeMeetLink ? 1 : 0,
      sendUpdates: input.attendees?.length ? "all" : "none",
      requestBody,
    });

    const event = response.data;
    if (!event.id) {
      throw new Error("Google Calendar did not return an event ID.");
    }

    let appointment = toAppointment(input.calendarId, event);

    if (input.includeMeetLink && !appointment.meetLink) {
      const refreshed = await client.events.get({
        calendarId: input.calendarId,
        eventId: event.id,
      });
      appointment = toAppointment(input.calendarId, refreshed.data);
    }

    if (input.includeMeetLink && !appointment.meetLink) {
      throw new Error("Google Calendar event was created but no Meet link was returned.");
    }

    return appointment;
  }

  async updateAppointment(input: UpdateAppointmentInput): Promise<CalendarAppointment> {
    const client = this.getClient();
    const timeZone = input.timeZone ?? DEFAULT_CALENDAR_TIMEZONE;

    const existing = await client.events.get({
      calendarId: input.calendarId,
      eventId: input.eventId,
    });

    const requestBody: calendar_v3.Schema$Event = {
      ...existing.data,
      summary: input.title ?? existing.data.summary,
      description: input.description ?? existing.data.description,
      location: input.location ?? existing.data.location,
    };

    if (input.startAt) {
      requestBody.start = {
        dateTime: formatGoogleCalendarDateTime(input.startAt, timeZone),
        timeZone,
      };
    }
    if (input.endAt) {
      requestBody.end = {
        dateTime: formatGoogleCalendarDateTime(input.endAt, timeZone),
        timeZone,
      };
    }
    if (input.attendees) {
      requestBody.attendees = input.attendees.map((a) => ({
        email: a.email,
        displayName: a.displayName,
      }));
    }

    const needsMeet = input.includeMeetLink && !extractMeetLink(existing.data);
    if (needsMeet) {
      requestBody.conferenceData = buildConferenceData(input.meetRequestId ?? randomUUID());
    }

    const response = await client.events.patch({
      calendarId: input.calendarId,
      eventId: input.eventId,
      conferenceDataVersion: needsMeet ? 1 : 0,
      sendUpdates: "none",
      requestBody,
    });

    return toAppointment(input.calendarId, response.data);
  }

  async cancelAppointment(input: CancelAppointmentInput): Promise<CalendarAppointment> {
    const client = this.getClient();
    const existing = await client.events.get({
      calendarId: input.calendarId,
      eventId: input.eventId,
    });

    const description = [existing.data.description, input.reason ? `Cancelled: ${input.reason}` : "Cancelled"]
      .filter(Boolean)
      .join("\n\n");

    const response = await client.events.patch({
      calendarId: input.calendarId,
      eventId: input.eventId,
      sendUpdates: input.notifyAttendees ? "all" : "none",
      requestBody: {
        status: "cancelled",
        description,
      },
    });

    return toAppointment(input.calendarId, response.data);
  }

  async deleteAppointment(input: DeleteAppointmentInput): Promise<void> {
    const client = this.getClient();
    await client.events.delete({
      calendarId: input.calendarId,
      eventId: input.eventId,
      sendUpdates: "none",
    });
  }

  async createMeetLink(input: CreateMeetLinkInput): Promise<CalendarAppointment> {
    this.assertMeetPrerequisites();
    return this.updateAppointment({
      calendarId: input.calendarId,
      eventId: input.eventId,
      includeMeetLink: true,
      meetRequestId: input.meetRequestId,
    });
  }
}
