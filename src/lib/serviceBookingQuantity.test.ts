import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampServiceBookingQuantity,
  MAX_SERVICE_BOOKING_QUANTITY,
} from "@/lib/serviceBookingQuantity";

describe("serviceBookingQuantity", () => {
  it("clamps quantity between 1 and max", () => {
    assert.equal(clampServiceBookingQuantity(0), 1);
    assert.equal(clampServiceBookingQuantity(3), 3);
    assert.equal(clampServiceBookingQuantity(99), MAX_SERVICE_BOOKING_QUANTITY);
    assert.equal(clampServiceBookingQuantity(Number.NaN), 1);
  });
});
