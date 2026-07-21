import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeCallbackPath } from "@/lib/safeCallbackPath";

describe("safeCallbackPath", () => {
  it("allows relative in-app paths", () => {
    assert.equal(safeCallbackPath("/account", "/"), "/account");
    assert.equal(safeCallbackPath("/discover/listings/abc", "/"), "/discover/listings/abc");
  });

  it("rejects absolute URLs and protocol-relative URLs", () => {
    assert.equal(safeCallbackPath("https://evil.example", "/account"), "/account");
    assert.equal(safeCallbackPath("//evil.example/phish", "/account"), "/account");
    assert.equal(safeCallbackPath("http://localhost:3000/account", "/"), "/");
  });

  it("uses fallback for empty or invalid input", () => {
    assert.equal(safeCallbackPath(null, "/account"), "/account");
    assert.equal(safeCallbackPath("   ", "/pulse"), "/pulse");
    assert.equal(safeCallbackPath("%E0%A4%A", "/"), "/");
  });
});
