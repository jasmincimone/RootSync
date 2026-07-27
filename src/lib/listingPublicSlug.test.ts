import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isListingCuidRef,
  normalizeListingPublicSlug,
  validateListingPublicSlug,
} from "@/lib/listingPublicSlug";

describe("listingPublicSlug", () => {
  it("normalizes messy input", () => {
    assert.equal(normalizeListingPublicSlug("  Summer Garden Guide!  "), "summer-garden-guide");
  });

  it("allows clearing the slug", () => {
    const result = validateListingPublicSlug("   ");
    assert.deepEqual(result, { ok: true, slug: null });
  });

  it("accepts a readable slug", () => {
    const result = validateListingPublicSlug("compost-101");
    assert.deepEqual(result, { ok: true, slug: "compost-101" });
  });

  it("rejects reserved and cuid-shaped values", () => {
    assert.equal(validateListingPublicSlug("book").ok, false);
    assert.equal(validateListingPublicSlug("cm4xabcdefghijklmnopqrst").ok, false);
    assert.equal(isListingCuidRef("cm4xabcdefghijklmnopqrstuv"), true);
  });
});
