import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { platformApplicationFeeCents, platformFeeBps } from "@/lib/platformFee";

describe("platformApplicationFeeCents", () => {
  it("takes a percentage of the charge (default 10%)", () => {
    assert.equal(platformFeeBps(), 1000);
    assert.equal(platformApplicationFeeCents(10_000), 1000);
    assert.equal(platformApplicationFeeCents(1999), 199);
  });

  it("never takes the full charge", () => {
    assert.equal(platformApplicationFeeCents(1), 0);
    assert.equal(platformApplicationFeeCents(5), 0);
    assert.ok(platformApplicationFeeCents(100) < 100);
  });

  it("returns 0 for invalid amounts", () => {
    assert.equal(platformApplicationFeeCents(0), 0);
    assert.equal(platformApplicationFeeCents(-50), 0);
  });
});
