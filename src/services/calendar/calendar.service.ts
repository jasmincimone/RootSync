import type { CalendarProvider } from "@/services/calendar/calendar-provider";
import { GoogleCalendarProvider } from "@/services/calendar/google-calendar-provider";
import { getGoogleCalendarId } from "@/services/calendar/google-credentials";
import type {
  CalendarAppointment,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreateMeetLinkInput,
  DeleteAppointmentInput,
  UpdateAppointmentInput,
} from "@/services/calendar/calendar.types";

/**
 * Platform calendar orchestration layer.
 * Booking workflows should call CalendarService — never Google APIs directly.
 */
export class CalendarService {
  private readonly provider: CalendarProvider;
  private readonly defaultCalendarId: string;

  constructor(options?: { provider?: CalendarProvider; defaultCalendarId?: string }) {
    this.provider = options?.provider ?? new GoogleCalendarProvider();
    this.defaultCalendarId = options?.defaultCalendarId ?? getGoogleCalendarId();
  }

  private resolveCalendarId(calendarId?: string): string {
    return calendarId?.trim() || this.defaultCalendarId;
  }

  async createAppointment(
    input: Omit<CreateAppointmentInput, "calendarId"> & { calendarId?: string },
  ): Promise<CalendarAppointment> {
    return this.provider.createAppointment({
      ...input,
      calendarId: this.resolveCalendarId(input.calendarId),
    });
  }

  async updateAppointment(
    input: Omit<UpdateAppointmentInput, "calendarId"> & { calendarId?: string },
  ): Promise<CalendarAppointment> {
    return this.provider.updateAppointment({
      ...input,
      calendarId: this.resolveCalendarId(input.calendarId),
    });
  }

  async cancelAppointment(
    input: Omit<CancelAppointmentInput, "calendarId"> & { calendarId?: string },
  ): Promise<CalendarAppointment> {
    return this.provider.cancelAppointment({
      ...input,
      calendarId: this.resolveCalendarId(input.calendarId),
    });
  }

  async deleteAppointment(
    input: Omit<DeleteAppointmentInput, "calendarId"> & { calendarId?: string },
  ): Promise<void> {
    return this.provider.deleteAppointment({
      ...input,
      calendarId: this.resolveCalendarId(input.calendarId),
    });
  }

  async createMeetLink(
    input: Omit<CreateMeetLinkInput, "calendarId"> & { calendarId?: string },
  ): Promise<CalendarAppointment> {
    return this.provider.createMeetLink({
      ...input,
      calendarId: this.resolveCalendarId(input.calendarId),
    });
  }
}

let defaultCalendarService: CalendarService | null = null;

/** Lazy singleton for server routes and jobs. Throws if Google env is missing. */
export function getCalendarService(): CalendarService {
  if (!defaultCalendarService) {
    defaultCalendarService = new CalendarService();
  }
  return defaultCalendarService;
}
