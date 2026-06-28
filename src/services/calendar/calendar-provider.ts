import type {
  CalendarAppointment,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreateMeetLinkInput,
  DeleteAppointmentInput,
  UpdateAppointmentInput,
} from "@/services/calendar/calendar.types";

/**
 * Provider-agnostic calendar contract.
 * Booking code must depend on CalendarService, not on this interface directly.
 */
export interface CalendarProvider {
  readonly id: string;

  createAppointment(input: CreateAppointmentInput): Promise<CalendarAppointment>;

  updateAppointment(input: UpdateAppointmentInput): Promise<CalendarAppointment>;

  /** Marks the event cancelled in the provider calendar (event retained). */
  cancelAppointment(input: CancelAppointmentInput): Promise<CalendarAppointment>;

  /** Permanently removes the event from the provider calendar. */
  deleteAppointment(input: DeleteAppointmentInput): Promise<void>;

  /** Adds or refreshes a Meet/conference link on an existing event. */
  createMeetLink(input: CreateMeetLinkInput): Promise<CalendarAppointment>;
}
