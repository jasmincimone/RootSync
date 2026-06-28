/**
 * Google Calendar + Meet proof of concept.
 *
 * Run: npm run calendar:poc
 *
 * Requires .env.local:
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./keys/google-service-account.json
 *   GOOGLE_CALENDAR_ID=<The Fix Urban Roots calendar id>
 */
import { CalendarService } from "../src/services/calendar/calendar.service";
import { assertGoogleCalendarEnv } from "../src/services/calendar/google-credentials";

async function main() {
  console.log("RootSync Calendar POC — The Fix Urban Roots\n");

  const { calendarId, impersonateUser } = assertGoogleCalendarEnv();
  console.log(`Calendar ID: ${calendarId}`);
  if (impersonateUser) {
    console.log(`Impersonating: ${impersonateUser}`);
  } else {
    console.warn(
      "Warning: GOOGLE_CALENDAR_IMPERSONATE_USER not set — Meet link creation will fail.",
    );
  }

  const service = new CalendarService();
  const startAt = new Date(Date.now() + 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);

  console.log("\n1. Creating test appointment with Google Meet…");
  const created = await service.createAppointment({
    title: "[RootSync POC] Service booking calendar test",
    description: "Automated proof-of-concept event. Safe to delete.",
    startAt,
    endAt,
    timeZone: "America/New_York",
    includeMeetLink: true,
    // Attendees require Workspace domain-wide delegation for service accounts; omitted in POC.
  });

  console.log("\n✓ Event created");
  console.log(`  Event ID:  ${created.eventId}`);
  console.log(`  Meet URL:  ${created.meetLink ?? "(missing)"}`);
  console.log(`  HTML link: ${created.htmlLink ?? "(n/a)"}`);

  if (!created.meetLink) {
    throw new Error("POC failed: Meet URL was not returned.");
  }

  console.log("\n2. Deleting test event…");
  await service.deleteAppointment({ eventId: created.eventId });
  console.log("✓ Event deleted");

  console.log("\nPOC succeeded. CalendarService is ready for the booking engine.");
}

function printDelegationHelp(message: string) {
  if (!message.includes("unauthorized_client")) return;
  console.error(`
Google Workspace domain-wide delegation is not configured for this service account.

To enable Google Meet via Calendar API:
  1. Google Cloud Console → Service Accounts → enable Domain-wide delegation
  2. Google Admin → Security → API controls → Domain-wide delegation → Add new
     Client ID: 105315689093662226939
     Scope:     https://www.googleapis.com/auth/calendar
  3. Set GOOGLE_CALENDAR_IMPERSONATE_USER=thefixurbanroots@rootsync.io

See docs/adr/ADR-003-calendar-abstraction.md for full steps.
`);
}

main().catch((err) => {
  console.error("\nPOC failed:");
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  printDelegationHelp(message);
  process.exit(1);
});
