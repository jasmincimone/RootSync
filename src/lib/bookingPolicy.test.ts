import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BOOKING_FREE_CANCELLATION_HOURS,
  refundCutoffAt,
  selfCancellationRefundable,
} from "@/lib/bookingPolicy";

const HOUR_MS = 60 * 60 * 1000;
const appointment = new Date("2026-09-01T15:00:00.000Z");

describe("selfCancellationRefundable", () => {
  it("refunds when cancelling well before the cutoff", () => {
    assert.equal(
      selfCancellationRefundable({
        scheduledStartAt: appointment,
        now: new Date(appointment.getTime() - 72 * HOUR_MS),
      }),
      true,
    );
  });

  it("refunds exactly at the cutoff", () => {
    assert.equal(
      selfCancellationRefundable({
        scheduledStartAt: appointment,
        now: refundCutoffAt(appointment),
      }),
      true,
    );
  });

  it("declines a refund inside the cancellation window", () => {
    assert.equal(
      selfCancellationRefundable({
        scheduledStartAt: appointment,
        now: new Date(appointment.getTime() - 2 * HOUR_MS),
      }),
      false,
    );
  });

  it("declines a refund after the appointment started", () => {
    assert.equal(
      selfCancellationRefundable({
        scheduledStartAt: appointment,
        now: new Date(appointment.getTime() + HOUR_MS),
      }),
      false,
    );
  });
});

describe("refundCutoffAt", () => {
  it("sits the configured number of hours before the appointment", () => {
    assert.equal(
      appointment.getTime() - refundCutoffAt(appointment).getTime(),
      BOOKING_FREE_CANCELLATION_HOURS * HOUR_MS,
    );
  });
});
