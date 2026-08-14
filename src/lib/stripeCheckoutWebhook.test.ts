import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveListingPaymentLinkUrl } from "@/lib/listingCheckoutOptions";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import {
  checkoutCompletedFields,
  connectDestinationPaymentIntentData,
  orderShippingFieldsFromCheckoutSession,
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

describe("orderShippingFieldsFromCheckoutSession", () => {
  it("maps shipping cost, total, and address", () => {
    const fields = orderShippingFieldsFromCheckoutSession({
      amount_total: 1850,
      shipping_cost: { amount_total: 850 },
      shipping_details: {
        name: " Jane Doe ",
        address: {
          line1: " 1 Main St ",
          line2: null,
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          country: "US",
        },
      },
    });
    assert.deepEqual(fields, {
      shippingCents: 850,
      totalCents: 1850,
      shippingName: "Jane Doe",
      shippingLine1: "1 Main St",
      shippingLine2: null,
      shippingCity: "Austin",
      shippingState: "TX",
      shippingPostal: "78701",
      shippingCountry: "US",
    });
  });

  it("reads collected_information.shipping_details when present", () => {
    const fields = orderShippingFieldsFromCheckoutSession({
      amount_total: 1000,
      shipping_cost: { amount_total: 0 },
      collected_information: {
        shipping_details: {
          name: "Pickup",
          address: { line1: "Booth 4", city: "Austin", state: "TX", postal_code: "78701", country: "US" },
        },
      },
    });
    assert.equal(fields.shippingCents, 0);
    assert.equal(fields.shippingName, "Pickup");
    assert.equal(fields.shippingLine1, "Booth 4");
  });
});
