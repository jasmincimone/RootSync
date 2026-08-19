import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  listingOffersLocalPickup,
  listingUsesShipping,
  resolveEffectiveShippingFlatCents,
  resolveServiceCheckoutMode,
  resolveShippingFulfillmentMode,
  formatFlatShippingLabel,
} from "@/lib/checkoutFulfillment";

describe("listingUsesShipping", () => {
  it("allows shipping only for physical Product listings", () => {
    assert.equal(listingUsesShipping("PRODUCT", true), true);
    assert.equal(listingUsesShipping("PRODUCT", false), false);
    assert.equal(listingUsesShipping("SERVICE", true), false);
    assert.equal(listingUsesShipping("RESOURCE", true), false);
    assert.equal(listingUsesShipping("EVENT", true), false);
  });
});

describe("resolveEffectiveShippingFlatCents", () => {
  it("prefers a listing override over the vendor default", () => {
    assert.equal(
      resolveEffectiveShippingFlatCents({
        listingShippingFlatCents: 2500,
        vendorShippingFlatCents: 800,
      }),
      2500,
    );
  });

  it("falls back to the vendor default when the listing has no override", () => {
    assert.equal(
      resolveEffectiveShippingFlatCents({
        listingShippingFlatCents: null,
        vendorShippingFlatCents: 800,
      }),
      800,
    );
  });
});

describe("formatFlatShippingLabel", () => {
  it("labels free shipping", () => {
    assert.equal(formatFlatShippingLabel(0), "Free shipping");
    assert.equal(formatFlatShippingLabel(null), "Free shipping");
  });

  it("formats whole-dollar and fractional rates", () => {
    assert.equal(formatFlatShippingLabel(800), "$8 shipping");
    assert.equal(formatFlatShippingLabel(850), "$8.50 shipping");
  });
});

describe("listingOffersLocalPickup", () => {
  it("defaults physical products to shipping only until the listing opts in", () => {
    assert.equal(
      listingOffersLocalPickup({ listingOffersLocalPickup: false, vendorOffersLocalPickup: true }),
      false,
    );
    assert.equal(
      listingOffersLocalPickup({ listingOffersLocalPickup: true, vendorOffersLocalPickup: true }),
      true,
    );
  });

  it("keeps the vendor profile as a master off switch", () => {
    assert.equal(
      listingOffersLocalPickup({ listingOffersLocalPickup: true, vendorOffersLocalPickup: false }),
      false,
    );
  });
});

describe("resolveShippingFulfillmentMode", () => {
  it("auto-selects ship when pickup is not offered", () => {
    assert.equal(
      resolveShippingFulfillmentMode({
        requiresShipping: true,
        offersLocalPickup: false,
        fulfillmentMode: null,
      }),
      "ship",
    );
  });

  it("requires an explicit choice when pickup is offered", () => {
    assert.throws(
      () =>
        resolveShippingFulfillmentMode({
          requiresShipping: true,
          offersLocalPickup: true,
          fulfillmentMode: null,
        }),
      /Choose pickup/,
    );
  });
});

describe("resolveServiceCheckoutMode", () => {
  it("sends listing-level external bookings to the vendor link", () => {
    assert.equal(
      resolveServiceCheckoutMode({
        externalCheckoutOnly: true,
        hasPaymentLink: true,
        hasStripeCheckout: false,
      }),
      "external_pay_link",
    );
  });

  it("keeps RootSync booking when Connect is ready", () => {
    assert.equal(
      resolveServiceCheckoutMode({
        externalCheckoutOnly: false,
        hasPaymentLink: false,
        hasStripeCheckout: true,
      }),
      "rootsync_booking",
    );
  });
});
