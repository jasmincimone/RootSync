import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPurchaseSummaryLine,
  nextCustomerStatus,
} from "@/lib/growth/orderContacts";
import { GROWTH_CONTACT_STATUS } from "@/lib/growth/roles";

describe("nextCustomerStatus", () => {
  it("promotes new buyers to CUSTOMER", () => {
    assert.equal(nextCustomerStatus(null), GROWTH_CONTACT_STATUS.CUSTOMER);
    assert.equal(nextCustomerStatus(GROWTH_CONTACT_STATUS.NEW_LEAD), GROWTH_CONTACT_STATUS.CUSTOMER);
  });

  it("promotes repeat buyers to RETURNING_CUSTOMER", () => {
    assert.equal(nextCustomerStatus(GROWTH_CONTACT_STATUS.CUSTOMER), GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER);
    assert.equal(
      nextCustomerStatus(GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER),
      GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER,
    );
  });
});

describe("formatPurchaseSummaryLine", () => {
  it("includes listing, quantity, and total", () => {
    const line = formatPurchaseSummaryLine({
      listingTitle: "Tower Garden",
      quantity: 2,
      priceCents: 5000,
      purchasedAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    assert.match(line, /Tower Garden ×2 \(\$100\.00\)/);
    assert.match(line, /2026-08-15/);
  });
});
