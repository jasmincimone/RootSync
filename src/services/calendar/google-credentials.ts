import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { GoogleServiceAccountKey } from "@/services/calendar/calendar.types";

const CREDENTIALS_ERROR =
  "Google service account credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (production) " +
  "or GOOGLE_SERVICE_ACCOUNT_KEY_PATH (local development).";

const CALENDAR_ID_ERROR =
  "GOOGLE_CALENDAR_ID is not set. Use the calendar ID for The Fix Urban Roots booking calendar.";

function parseServiceAccountJson(raw: string, source: string): GoogleServiceAccountKey {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid Google service account JSON from ${source}.`);
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as GoogleServiceAccountKey).client_email !== "string" ||
    typeof (parsed as GoogleServiceAccountKey).private_key !== "string"
  ) {
    throw new Error(`Google service account JSON from ${source} is missing client_email or private_key.`);
  }
  return parsed as GoogleServiceAccountKey;
}

/**
 * Loads service account credentials.
 * 1. GOOGLE_SERVICE_ACCOUNT_JSON (full JSON string — Vercel production)
 * 2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH (file path — local dev)
 */
export function loadGoogleServiceAccountCredentials(): GoogleServiceAccountKey {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    return parseServiceAccountJson(inline, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH?.trim();
  if (keyPath) {
    const resolved = resolve(process.cwd(), keyPath);
    const raw = readFileSync(resolved, "utf8");
    return parseServiceAccountJson(raw, `GOOGLE_SERVICE_ACCOUNT_KEY_PATH (${resolved})`);
  }

  throw new Error(CREDENTIALS_ERROR);
}

export function getGoogleCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (!id) {
    throw new Error(CALENDAR_ID_ERROR);
  }
  return id;
}

/**
 * Workspace user to impersonate when creating Meet links (domain-wide delegation).
 * Example: thefixurbanroots@rootsync.io
 */
export function getGoogleCalendarImpersonateUser(): string | undefined {
  const email = process.env.GOOGLE_CALENDAR_IMPERSONATE_USER?.trim();
  return email || undefined;
}

export function assertGoogleCalendarEnv(): {
  calendarId: string;
  credentials: GoogleServiceAccountKey;
  impersonateUser?: string;
} {
  return {
    calendarId: getGoogleCalendarId(),
    credentials: loadGoogleServiceAccountCredentials(),
    impersonateUser: getGoogleCalendarImpersonateUser(),
  };
}
