import { prisma } from "@/lib/prisma";
import { EVENT_ATTENDANCE_MODE } from "@/lib/roles";
import { getCalendarService } from "@/services/calendar/calendar.service";
import { isGoogleCalendarConfigured } from "@/services/calendar/google-credentials";

/** Stable public Jitsi room when Google Calendar Meet is unavailable. */
export function jitsiMeetUrlForOffering(offeringId: string): string {
  const room = `rootsync-event-${offeringId}`.replace(/[^a-zA-Z0-9-_]/g, "-");
  return `https://meet.jit.si/${room}`;
}

function isJitsiMeetUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "meet.jit.si" || host.endsWith(".jit.si");
  } catch {
    return false;
  }
}

/**
 * Ensure VIRTUAL_MEET events always have a join URL:
 * 1. Keep vendor-pasted Meet/Zoom/etc. URLs (manual override)
 * 2. Try Google Calendar Meet when env is configured
 * 3. Fall back to a stable Jitsi room
 *
 * Still soft on missing start/end (cannot schedule without times).
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

  const existingMeet = details.meetUrl?.trim() || null;
  const isManualOverride =
    Boolean(existingMeet) &&
    !details.googleCalendarEventId &&
    !isJitsiMeetUrl(existingMeet!);

  // Vendor pasted their own Meet (or other) link — do not overwrite.
  if (isManualOverride) {
    return;
  }

  if (isGoogleCalendarConfigured()) {
    try {
      const calendar = getCalendarService();
      if (details.googleCalendarEventId) {
        const updated = await calendar.updateAppointment({
          eventId: details.googleCalendarEventId,
          title: offering.title,
          description: offering.description.slice(0, 500),
          startAt: details.startsAt,
          endAt: details.endsAt,
          includeMeetLink: true,
        });
        const meetUrl = updated.meetLink?.trim() || existingMeet || jitsiMeetUrlForOffering(offeringId);
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
      const meetUrl =
        created.meetLink?.trim() || existingMeet || jitsiMeetUrlForOffering(offeringId);
      await prisma.eventDetails.update({
        where: { offeringId },
        data: {
          meetUrl,
          googleCalendarEventId: created.eventId,
        },
      });
      return;
    } catch (err) {
      console.warn("[eventMeet] Google Calendar provision failed; using Jitsi", offeringId, err);
    }
  }

  const jitsiUrl = existingMeet && isJitsiMeetUrl(existingMeet)
    ? existingMeet
    : jitsiMeetUrlForOffering(offeringId);

  if (jitsiUrl !== details.meetUrl || details.googleCalendarEventId) {
    await prisma.eventDetails.update({
      where: { offeringId },
      data: {
        meetUrl: jitsiUrl,
        googleCalendarEventId: null,
      },
    });
  }
}
