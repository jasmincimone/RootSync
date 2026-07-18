import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertPublishableOfferingDetails } from "@/lib/offeringDetails";
import {
  EVENT_ATTENDANCE_MODE,
  LISTING_TYPE,
  OFFERING_STATUS,
} from "@/lib/roles";

describe("assertPublishableOfferingDetails", () => {
  it("allows incomplete Resource drafts", () => {
    assert.doesNotThrow(() =>
      assertPublishableOfferingDetails({
        listingType: LISTING_TYPE.RESOURCE,
        status: OFFERING_STATUS.DRAFT,
        details: { resource: { fileUrl: null } },
      }),
    );
  });

  it("requires a delivery file before publishing a Resource", () => {
    assert.throws(
      () =>
        assertPublishableOfferingDetails({
          listingType: LISTING_TYPE.RESOURCE,
          status: OFFERING_STATUS.ACTIVE,
          details: { resource: { fileUrl: null } },
          priceCents: 1200,
        }),
      /Upload the Resource file/,
    );
  });

  it("rejects free Resources before publishing", () => {
    assert.throws(
      () =>
        assertPublishableOfferingDetails({
          listingType: LISTING_TYPE.RESOURCE,
          status: OFFERING_STATUS.ACTIVE,
          details: { resource: { fileUrl: "https://cdn.example/file.pdf" } },
          priceCents: 0,
        }),
      /Free Resources are not supported/,
    );
  });

  it("requires an external event-space link before publishing", () => {
    assert.throws(
      () =>
        assertPublishableOfferingDetails({
          listingType: LISTING_TYPE.EVENT,
          status: OFFERING_STATUS.ACTIVE,
          details: {
            event: {
              attendanceMode: EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL,
              externalJoinUrl: null,
            },
          },
          priceCents: 2500,
        }),
      /external event-space link/,
    );
  });

  it("rejects free Events before publishing", () => {
    assert.throws(
      () =>
        assertPublishableOfferingDetails({
          listingType: LISTING_TYPE.EVENT,
          status: OFFERING_STATUS.ACTIVE,
          details: {
            event: {
              attendanceMode: EVENT_ATTENDANCE_MODE.IN_PERSON,
              venue: "Community Hall",
            },
          },
          priceCents: 0,
        }),
      /Free Events are not supported/,
    );
  });

  it("accepts a configured in-person Event", () => {
    assert.doesNotThrow(() =>
      assertPublishableOfferingDetails({
        listingType: LISTING_TYPE.EVENT,
        status: OFFERING_STATUS.SCHEDULED,
        details: {
          event: {
            attendanceMode: EVENT_ATTENDANCE_MODE.IN_PERSON,
            venue: "Community Hall",
          },
        },
        priceCents: 1500,
      }),
    );
  });
});
