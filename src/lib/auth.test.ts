import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

process.env.NEXTAUTH_SECRET = "test-secret-for-unit-tests-only";

import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from "@/lib/auth";

describe("password hashing", () => {
  it("hashes and verifies with bcrypt", () => {
    const hash = hashPassword("CorrectHorseBattery1!");
    assert.ok(hash.startsWith("$2"));
    assert.equal(verifyPassword("CorrectHorseBattery1!", hash), true);
    assert.equal(verifyPassword("wrong-password", hash), false);
    assert.equal(passwordHashNeedsUpgrade(hash), false);
  });

  it("still verifies legacy SHA-256 hashes and flags upgrade", () => {
    const legacy = createHash("sha256")
      .update(`${process.env.NEXTAUTH_SECRET}CorrectHorseBattery1!`)
      .digest("hex");
    assert.equal(verifyPassword("CorrectHorseBattery1!", legacy), true);
    assert.equal(passwordHashNeedsUpgrade(legacy), true);
  });
});
