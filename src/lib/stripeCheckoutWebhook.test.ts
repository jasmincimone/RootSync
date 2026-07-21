import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveListingPaymentLinkUrl } from "@/lib/listingCheckoutOptions";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import {
  checkoutCompletedFields,
  connectDestinationPaymentIntentData,
  shouldConfirmServiceBooking,
} from "@/lib/stripeCheckoutWebhook";

describe("resolveListingPaymentLinkUrl", () => {
  it("prefers the offering payment URL over the vendor default", () => {
    assert.equal(
      resolveListingPaymentLinkUrl({
        offeringPaymentUrl: " https://buy.stripe.com/listing ",
        vendorPaymentLinkUrl: "https://buy.stripe.com/vendor",
      }),
      "https://buy.stripe.com/listing",
    );
  });

  it("falls back to the vendor payment link", () => {
    assert.equal(
      resolveListingPaymentLinkUrl({
        offeringPaymentUrl: null,
        vendorPaymentLinkUrl: " https://buy.stripe.com/vendor ",
      }),
      "https://buy.stripe.com/vendor",
    );
  });

  it("returns null when neither link exists", () => {
    assert.equal(
      resolveListingPaymentLinkUrl({
        offeringPaymentUrl: "  ",
        vendorPaymentLinkUrl: null,
      }),
      null,
    );
  });
});

describe("checkoutCompletedFields", () => {
  it("reads order and booking metadata for fulfillment", () => {
    const fields = checkoutCompletedFields({
      id: "cs_test_1",
      metadata: {
        orderId: " ord_1 ",
        bookingId: "book_1",
        type: "service_booking",
      },
      payment_intent: "pi_abc",
    });
    assert.deepEqual(fields, {
      orderId: "ord_1",
      bookingId: "book_1",
      checkoutType: "service_booking",
      paymentIntentId: "pi_abc",
    });
    assert.equal(shouldConfirmServiceBooking(fields), true);
  });

  it("supports expanded payment_intent objects", () => {
    const fields = checkoutCompletedFields({
      id: "cs_test_2",
      metadata: { orderId: "ord_2" },
      payment_intent: { id: "pi_expanded" },
    });
    assert.equal(fields.paymentIntentId, "pi_expanded");
    assert.equal(shouldConfirmServiceBooking(fields), false);
  });

  it("no-ops when orderId is missing", () => {
    const fields = checkoutCompletedFields({
      id: "cs_test_3",
      metadata: { type: "service_booking", bookingId: "book_x" },
      payment_intent: null,
    });
    assert.equal(fields.orderId, null);
    assert.equal(shouldConfirmServiceBooking(fields), true);
  });
});

describe("connectDestinationPaymentIntentData", () => {
  it("builds destination charge with platform fee under the charge", () => {
    const charge = 10_000;
    const fee = platformApplicationFeeCents(charge);
    const data = connectDestinationPaymentIntentData(charge, "acct_vendor", fee);
    assert.equal(data.application_fee_amount, 1000);
    assert.equal(data.transfer_data.destination, "acct_vendor");
    assert.ok(data.application_fee_amount < charge);
  });

  it("never takes the full charge even if a bad fee is passed", () => {
    const data = connectDestinationPaymentIntentData(100, "acct_vendor", 999);
    assert.equal(data.application_fee_amount, 99);
  });

  it("rejects invalid destinations and amounts", () => {
    assert.throws(
      () => connectDestinationPaymentIntentData(1000, "cus_not_connect", 100),
      /acct_/,
    );
    assert.throws(() => connectDestinationPaymentIntentData(0, "acct_vendor", 0), /positive/);
  });
});
