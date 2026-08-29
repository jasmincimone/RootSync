import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { slotGridIntervalMinutes } from "@/lib/timezone";
import { generateAvailableSlots, getServiceDurationMinutes, slotStartIsGridAligned } from "@/lib/bookingSlots";
import type { BookableServiceListing } from "@/lib/bookingAccess";

function mockListing(overrides?: {
  durationMinutes?: number;
  variantDuration?: number;
}): BookableServiceListing {
  const duration = overrides?.durationMinutes ?? 60;
  return {
    id: "listing-1",
    title: "Test Service",
    description: "",
    priceCents: 5000,
    imageUrl: null,
    listingType: "SERVICE",
    publicSlug: null,
    offeringId: "offering-1",
    vendorProfileId: "vendor-1",
    vendorProfile: {
      id: "vendor-1",
      displayName: "Vendor",
      contactEmail: null,
      user: { id: "u1", email: "v@test.com", stripeConnectAccountId: null },
    },
    offering: {
      serviceDetails: {
        serviceKind: "CONSULTATION",
        durationMinutes: duration,
        fulfillmentMethod: "VIRTUAL",
        defaultTimeZone: "America/New_York",
        terms: null,
        requiresAccountToBook: false,
      },
      availabilityRules: [
        { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
      ],
      intakeQuestions: [],
      variants: overrides?.variantDuration
        ? [
            {
              id: "var-1",
              title: "Session",
              priceCents: 5000,
              durationMinutes: overrides.variantDuration,
              sku: null,
            },
          ]
        : [],
    },
    selectedVariantId: overrides?.variantDuration ? "var-1" : null,
  } as BookableServiceListing;
}

describe("bookingSlots", () => {
  it("uses half-hour grid for 60-minute sessions", () => {
    assert.equal(slotGridIntervalMinutes(60), 30);
  });

  it("uses half-hour grid for 90-minute sessions", () => {
    assert.equal(slotGridIntervalMinutes(90), 30);
  });

  it("generates on-the-hour and half-hour start times for 60-minute Monday slots", () => {
    const listing = mockListing({ durationMinutes: 60 });
    // Use a Monday window in the future so slots are not filtered as past.
    const now = new Date();
    const day = now.getUTCDay(); // 0 Sun … 1 Mon
    const daysUntilMon = (1 - day + 7) % 7 || 7;
    const nextMondayUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMon,
      4,
      0,
      0,
      0,
    );
    const from = new Date(nextMondayUtc);
    const to = new Date(nextMondayUtc + 7 * 24 * 60 * 60 * 1000);
    const slots = generateAvailableSlots({
      listing,
      from,
      to,
      bookedRanges: [],
    });
    assert.ok(slots.length > 0, `expected slots between ${from.toISOString()} and ${to.toISOString()}`);
    const minuteMarks = new Set<number>();
    for (const slot of slots) {
      const start = new Date(slot.startAt);
      assert.ok(
        slotStartIsGridAligned(start, 60, "America/New_York"),
        `expected half-hour-aligned slot, got ${slot.startAt}`,
      );
      const durationMs = new Date(slot.endAt).getTime() - start.getTime();
      assert.equal(durationMs, 60 * 60_000);
      const localHour = new Date(slot.startAt).toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const [, minutePart] = localHour.split(":");
      minuteMarks.add(Number.parseInt(minutePart ?? "0", 10));
    }
    assert.ok(minuteMarks.has(0), "expected on-the-hour slots");
    assert.ok(minuteMarks.has(30), "expected half-hour slots");
  });

  it("variant duration overrides service default", () => {
    const listing = mockListing({ durationMinutes: 60, variantDuration: 30 });
    assert.equal(getServiceDurationMinutes(listing, "var-1"), 30);
  });
});
