import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { CalendarService } from "@/services/calendar/calendar.service";
import type { CalendarProvider } from "@/services/calendar/calendar-provider";
import type { CalendarAppointment } from "@/services/calendar/calendar.types";
import {
  getGoogleCalendarId,
  loadGoogleServiceAccountCredentials,
} from "@/services/calendar/google-credentials";

const SAMPLE_KEY = {
  type: "service_account",
  client_email: "rootsync@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
};

describe("google-credentials", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("prefers GOOGLE_SERVICE_ACCOUNT_JSON over KEY_PATH", () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(SAMPLE_KEY);
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = "/should/not/be/read";
    const creds = loadGoogleServiceAccountCredentials();
    assert.equal(creds.client_email, SAMPLE_KEY.client_email);
  });

  it("loads credentials from GOOGLE_SERVICE_ACCOUNT_KEY_PATH", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const dir = mkdtempSync(join(tmpdir(), "rootsync-cal-"));
    const file = join(dir, "sa.json");
    writeFileSync(file, JSON.stringify(SAMPLE_KEY));
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = file;
    const creds = loadGoogleServiceAccountCredentials();
    assert.equal(creds.client_email, SAMPLE_KEY.client_email);
    unlinkSync(file);
  });

  it("throws when neither credential env is set", () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    assert.throws(() => loadGoogleServiceAccountCredentials(), /not configured/);
  });

  it("requires GOOGLE_CALENDAR_ID", () => {
    delete process.env.GOOGLE_CALENDAR_ID;
    assert.throws(() => getGoogleCalendarId(), /GOOGLE_CALENDAR_ID/);
  });
});

describe("CalendarService", () => {
  const fakeAppointment: CalendarAppointment = {
    provider: "google",
    calendarId: "cal@test",
    eventId: "evt_123",
    meetLink: "https://meet.google.com/abc-defg-hij",
  };

  const provider: CalendarProvider = {
    id: "google",
    createAppointment: async () => fakeAppointment,
    updateAppointment: async () => fakeAppointment,
    cancelAppointment: async () => ({ ...fakeAppointment, status: "cancelled" }),
    deleteAppointment: async () => undefined,
    createMeetLink: async () => fakeAppointment,
  };

  it("delegates createAppointment to the provider with default calendar id", async () => {
    let capturedCalendarId = "";
    const trackingProvider: CalendarProvider = {
      ...provider,
      createAppointment: async (input) => {
        capturedCalendarId = input.calendarId;
        return fakeAppointment;
      },
    };
    const service = new CalendarService({
      provider: trackingProvider,
      defaultCalendarId: "cal@test",
    });
    const result = await service.createAppointment({
      title: "POC",
      startAt: new Date("2026-07-01T15:00:00.000Z"),
      endAt: new Date("2026-07-01T16:00:00.000Z"),
      includeMeetLink: true,
    });
    assert.equal(result.eventId, "evt_123");
    assert.equal(result.meetLink, fakeAppointment.meetLink);
    assert.equal(capturedCalendarId, "cal@test");
  });
});
