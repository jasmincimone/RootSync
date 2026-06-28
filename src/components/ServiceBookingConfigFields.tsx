"use client";

import { Button } from "@/components/ui/Button";
import {
  COMMON_TIME_ZONES,
  DEFAULT_AVAILABILITY_RULES,
  dayLabel,
  minutesToTimeValue,
  timeValueToMinutes,
  type AvailabilityRuleInput,
  type IntakeQuestionInput,
} from "@/lib/serviceBookingConfig";
import { cn } from "@/lib/cn";

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text";

type DaySchedule = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type Props = {
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  availabilityRules: AvailabilityRuleInput[];
  onAvailabilityRulesChange: (rules: AvailabilityRuleInput[]) => void;
  intakeQuestions: IntakeQuestionInput[];
  onIntakeQuestionsChange: (questions: IntakeQuestionInput[]) => void;
  disabled?: boolean;
};

function rulesToDaySchedules(rules: AvailabilityRuleInput[]): DaySchedule[] {
  const schedules: DaySchedule[] = Array.from({ length: 7 }, () => ({
    enabled: false,
    startTime: "09:00",
    endTime: "17:00",
  }));

  for (const rule of rules) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) continue;
    schedules[rule.dayOfWeek] = {
      enabled: true,
      startTime: minutesToTimeValue(rule.startMinutes),
      endTime: minutesToTimeValue(rule.endMinutes),
    };
  }

  return schedules;
}

function daySchedulesToRules(schedules: DaySchedule[], timeZone: string): AvailabilityRuleInput[] {
  const rules: AvailabilityRuleInput[] = [];
  schedules.forEach((schedule, dayOfWeek) => {
    if (!schedule.enabled) return;
    const startMinutes = timeValueToMinutes(schedule.startTime);
    const endMinutes = timeValueToMinutes(schedule.endTime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) return;
    rules.push({ dayOfWeek, startMinutes, endMinutes, timeZone });
  });
  return rules;
}

export function ServiceBookingConfigFields({
  timeZone,
  onTimeZoneChange,
  availabilityRules,
  onAvailabilityRulesChange,
  intakeQuestions,
  onIntakeQuestionsChange,
  disabled = false,
}: Props) {
  const schedules = rulesToDaySchedules(availabilityRules);

  function updateSchedule(dayOfWeek: number, patch: Partial<DaySchedule>) {
    const next = schedules.map((s, i) => (i === dayOfWeek ? { ...s, ...patch } : s));
    onAvailabilityRulesChange(daySchedulesToRules(next, timeZone));
  }

  function applyDefaultWeek() {
    onAvailabilityRulesChange(DEFAULT_AVAILABILITY_RULES.map((r) => ({ ...r, timeZone })));
  }

  function clearAvailability() {
    onAvailabilityRulesChange([]);
  }

  function addIntakeQuestion() {
    onIntakeQuestionsChange([
      ...intakeQuestions,
      { question: "", required: true, sortOrder: intakeQuestions.length },
    ]);
  }

  function updateIntakeQuestion(index: number, patch: Partial<IntakeQuestionInput>) {
    onIntakeQuestionsChange(
      intakeQuestions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function removeIntakeQuestion(index: number) {
    onIntakeQuestionsChange(
      intakeQuestions
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, sortOrder: i })),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-fix-heading">Weekly availability</h3>
        <p className="mt-1 text-xs text-fix-text-muted">
          Members book in slots matching your service duration. Leave empty to use platform
          defaults (Mon–Fri 9am–5pm Eastern).
        </p>

        <div className="mt-3">
          <label className="block text-sm font-medium text-fix-text">Time zone</label>
          <select
            value={timeZone}
            disabled={disabled}
            onChange={(e) => {
              const tz = e.target.value;
              onTimeZoneChange(tz);
              onAvailabilityRulesChange(
                availabilityRules.map((r) => ({ ...r, timeZone: tz })),
              );
            }}
            className={inputClass}
          >
            {COMMON_TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {schedules.map((schedule, dayOfWeek) => (
            <div
              key={dayOfWeek}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border border-fix-border/15 px-3 py-2",
                schedule.enabled ? "bg-fix-surface" : "bg-fix-bg-muted/40",
              )}
            >
              <label className="flex min-w-[4.5rem] items-center gap-2 text-sm font-medium text-fix-heading">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  disabled={disabled}
                  onChange={(e) => updateSchedule(dayOfWeek, { enabled: e.target.checked })}
                />
                {dayLabel(dayOfWeek)}
              </label>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="time"
                  value={schedule.startTime}
                  disabled={disabled || !schedule.enabled}
                  onChange={(e) => updateSchedule(dayOfWeek, { startTime: e.target.value })}
                  className="rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1.5 text-fix-text disabled:opacity-50"
                />
                <span className="text-fix-text-muted">to</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  disabled={disabled || !schedule.enabled}
                  onChange={(e) => updateSchedule(dayOfWeek, { endTime: e.target.value })}
                  className="rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1.5 text-fix-text disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={applyDefaultWeek}
          >
            Use Mon–Fri 9–5
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={clearAvailability}
          >
            Clear (platform default)
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-fix-heading">Intake questions</h3>
        <p className="mt-1 text-xs text-fix-text-muted">
          Shown during booking before payment. Required questions must be answered.
        </p>

        <div className="mt-3 space-y-3">
          {intakeQuestions.length === 0 ? (
            <p className="text-sm text-fix-text-muted">No custom questions — optional notes field only.</p>
          ) : (
            intakeQuestions.map((q, index) => (
              <div
                key={`intake-${index}`}
                className="rounded-lg border border-fix-border/15 p-3"
              >
                <label className="block text-sm font-medium text-fix-text">Question</label>
                <input
                  value={q.question}
                  disabled={disabled}
                  onChange={(e) => updateIntakeQuestion(index, { question: e.target.value })}
                  placeholder="e.g. What would you like to focus on?"
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-fix-text">
                    <input
                      type="checkbox"
                      checked={q.required}
                      disabled={disabled}
                      onChange={(e) => updateIntakeQuestion(index, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeIntakeQuestion(index)}
                    className="text-sm text-fix-text-muted hover:text-bark"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={disabled}
          onClick={addIntakeQuestion}
        >
          Add question
        </Button>
      </div>
    </div>
  );
}
