import type { Prisma } from "@prisma/client";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type SerializedAvailabilityRule = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
};

export type SerializedIntakeQuestion = {
  id: string;
  sortOrder: number;
  question: string;
  required: boolean;
};

export type SerializedServiceBookingConfig = {
  availabilityRules: SerializedAvailabilityRule[];
  intakeQuestions: SerializedIntakeQuestion[];
};

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
};

export type IntakeQuestionInput = {
  question: string;
  required: boolean;
  sortOrder: number;
};

export type ServiceBookingConfigInput = {
  availabilityRules?: AvailabilityRuleInput[];
  intakeQuestions?: IntakeQuestionInput[];
};

/** Default Mon–Fri 9am–5pm Eastern for new service offerings. */
export const DEFAULT_AVAILABILITY_RULES: AvailabilityRuleInput[] = [
  1, 2, 3, 4, 5,
].map((dayOfWeek) => ({
  dayOfWeek,
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
  timeZone: "America/New_York",
}));

export const COMMON_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
] as const;

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function minutesToTimeValue(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function parseRuleRow(raw: unknown, defaultTimeZone: string): AvailabilityRuleInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const dayOfWeek =
    typeof row.dayOfWeek === "number"
      ? row.dayOfWeek
      : typeof row.dayOfWeek === "string"
        ? Number.parseInt(row.dayOfWeek, 10)
        : NaN;
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null;

  let startMinutes: number | null = null;
  let endMinutes: number | null = null;

  if (typeof row.startMinutes === "number") startMinutes = row.startMinutes;
  else if (typeof row.startTime === "string") startMinutes = timeValueToMinutes(row.startTime);

  if (typeof row.endMinutes === "number") endMinutes = row.endMinutes;
  else if (typeof row.endTime === "string") endMinutes = timeValueToMinutes(row.endTime);

  if (startMinutes === null || endMinutes === null) return null;
  if (startMinutes < 0 || endMinutes > 24 * 60 || startMinutes >= endMinutes) {
    throw new Error(`Invalid hours for ${dayLabel(dayOfWeek)}. End must be after start.`);
  }

  const timeZone =
    typeof row.timeZone === "string" && row.timeZone.trim()
      ? row.timeZone.trim()
      : defaultTimeZone;

  return { dayOfWeek, startMinutes, endMinutes, timeZone };
}

function parseIntakeRow(raw: unknown, sortOrder: number): IntakeQuestionInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const question = typeof row.question === "string" ? row.question.trim() : "";
  if (!question) return null;
  return {
    question,
    required: row.required !== false,
    sortOrder:
      typeof row.sortOrder === "number" && Number.isInteger(row.sortOrder)
        ? row.sortOrder
        : sortOrder,
  };
}

export function parseServiceBookingConfigFromBody(
  body: Record<string, unknown>,
  defaultTimeZone = "America/New_York",
): ServiceBookingConfigInput | undefined {
  const booking = (body.booking ?? body) as Record<string, unknown>;
  const hasRules = "availabilityRules" in booking;
  const hasQuestions = "intakeQuestions" in booking;
  if (!hasRules && !hasQuestions) return undefined;

  const result: ServiceBookingConfigInput = {};

  if (hasRules) {
    const rawRules = booking.availabilityRules;
    if (!Array.isArray(rawRules)) {
      throw new Error("availabilityRules must be an array.");
    }
    const rules: AvailabilityRuleInput[] = [];
    for (const row of rawRules) {
      const parsed = parseRuleRow(row, defaultTimeZone);
      if (parsed) rules.push(parsed);
    }
    result.availabilityRules = rules;
  }

  if (hasQuestions) {
    const rawQuestions = booking.intakeQuestions;
    if (!Array.isArray(rawQuestions)) {
      throw new Error("intakeQuestions must be an array.");
    }
    const questions: IntakeQuestionInput[] = [];
    rawQuestions.forEach((row, index) => {
      const parsed = parseIntakeRow(row, index);
      if (parsed) questions.push(parsed);
    });
    result.intakeQuestions = questions;
  }

  return result;
}

export function serializeServiceBookingConfig(offering: {
  availabilityRules?: Array<{
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    timeZone: string;
  }>;
  intakeQuestions?: Array<{
    id: string;
    sortOrder: number;
    question: string;
    required: boolean;
  }>;
}): SerializedServiceBookingConfig {
  return {
    availabilityRules: (offering.availabilityRules ?? []).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startMinutes: r.startMinutes,
      endMinutes: r.endMinutes,
      timeZone: r.timeZone,
    })),
    intakeQuestions: (offering.intakeQuestions ?? []).map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      question: q.question,
      required: q.required,
    })),
  };
}

export async function syncServiceBookingConfig(
  tx: Prisma.TransactionClient,
  offeringId: string,
  config: ServiceBookingConfigInput | undefined,
) {
  if (!config) return;

  if (config.availabilityRules !== undefined) {
    await tx.serviceAvailabilityRule.deleteMany({ where: { offeringId } });
    if (config.availabilityRules.length > 0) {
      await tx.serviceAvailabilityRule.createMany({
        data: config.availabilityRules.map((r) => ({
          offeringId,
          dayOfWeek: r.dayOfWeek,
          startMinutes: r.startMinutes,
          endMinutes: r.endMinutes,
          timeZone: r.timeZone,
        })),
      });
    }
  }

  if (config.intakeQuestions !== undefined) {
    await tx.serviceIntakeQuestion.deleteMany({ where: { offeringId } });
    if (config.intakeQuestions.length > 0) {
      await tx.serviceIntakeQuestion.createMany({
        data: config.intakeQuestions.map((q) => ({
          offeringId,
          sortOrder: q.sortOrder,
          question: q.question,
          required: q.required,
        })),
      });
    }
  }
}

export async function deleteServiceBookingConfig(
  tx: Prisma.TransactionClient,
  offeringId: string,
) {
  await tx.serviceAvailabilityRule.deleteMany({ where: { offeringId } });
  await tx.serviceIntakeQuestion.deleteMany({ where: { offeringId } });
}
