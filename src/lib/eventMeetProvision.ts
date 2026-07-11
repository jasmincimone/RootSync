import { prisma } from "@/lib/prisma";
import { EVENT_ATTENDANCE_MODE } from "@/lib/roles";
import { getCalendarService } from "@/services/calendar/calendar.service";

/**
 * Best-effort: create/update a platform calendar event with Google Meet for VIRTUAL_MEET events.
 * Does not throw — vendors can still save listings if calendar env is missing.
 */
export async function provisionEventMeetIfNeeded(offeringId: string): Promise<void> {
  const details = await prisma.eventDetails.findUnique({ where: { offeringId } });
  if (!details || details.attendanceMode !== EVENT_ATTENDANCE_MODE.VIRTUAL_MEET) {
    return;
  }
  if (!details.startsAt || !details.endsAt) {
    return;
  }
  if (details.endsAt.getTime() <= details.startsAt.getTime()) {
    return;
  }

  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: { title: true, description: true },
  });
  if (!offering) return;

  try {
    const calendar = getCalendarService();
    if (details.googleCalendarEventId && details.meetUrl) {
      const updated = await calendar.updateAppointment({
        eventId: details.googleCalendarEventId,
        title: offering.title,
        description: offering.description.slice(0, 500),
        startAt: details.startsAt,
        endAt: details.endsAt,
        includeMeetLink: true,
      });
      const meetUrl = updated.meetLink ?? details.meetUrl;
      if (meetUrl !== details.meetUrl) {
        await prisma.eventDetails.update({
          where: { offeringId },
          data: { meetUrl },
        });
      }
      return;
    }

    const created = await calendar.createAppointment({
      title: offering.title,
      description: offering.description.slice(0, 500),
      startAt: details.startsAt,
      endAt: details.endsAt,
      includeMeetLink: true,
      meetRequestId: `event-meet-${offeringId}`,
    });
    await prisma.eventDetails.update({
      where: { offeringId },
      data: {
        meetUrl: created.meetLink ?? null,
        googleCalendarEventId: created.eventId,
      },
    });
  } catch (err) {
    console.warn("[eventMeet] provision skipped", offeringId, err);
  }
}
