import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeResourceFileRef } from "@/lib/resourceFileShared";

describe("normalizeResourceFileRef", () => {
  it("accepts blob: vendor-resources refs", () => {
    const ref = "blob:vendor-resources/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pdf";
    assert.equal(normalizeResourceFileRef(ref), ref);
  });

  it("accepts local /uploads paths", () => {
    assert.equal(
      normalizeResourceFileRef("/uploads/vendor-resources/plan.pdf"),
      "/uploads/vendor-resources/plan.pdf",
    );
  });

  it("accepts https URLs", () => {
    assert.equal(
      normalizeResourceFileRef("https://cdn.example.com/plan.pdf"),
      "https://cdn.example.com/plan.pdf",
    );
  });

  it("clears empty values", () => {
    assert.equal(normalizeResourceFileRef(""), null);
    assert.equal(normalizeResourceFileRef(null), null);
  });

  it("rejects invalid blob paths", () => {
    assert.throws(() => normalizeResourceFileRef("blob:not-a-valid-path.pdf"), /Invalid uploaded/);
  });

  it("rejects non-http schemes that are not blob uploads", () => {
    assert.throws(() => normalizeResourceFileRef("ftp://files.example/a.pdf"), /http or https/);
  });
});
