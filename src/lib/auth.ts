import { createHash, timingSafeEqual } from "crypto";
import { compareSync, hashSync } from "bcryptjs";

const BCRYPT_ROUNDS = 12;
/** Legacy SHA-256 salt used before bcrypt migration (do not use for new hashes). */
const LEGACY_HARDCODED_SALT = "fix-collective-salt";

function requireAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for password hashing.");
  }
  return secret;
}

function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

function legacySha256(password: string, salt: string): string {
  return createHash("sha256").update(salt + password).digest("hex");
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Hash a new password with bcrypt. Requires NEXTAUTH_SECRET to be set. */
export function hashPassword(password: string): string {
  requireAuthSecret();
  return hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against bcrypt (current) or legacy SHA-256 hashes.
 * Callers that succeed on a legacy hash should re-hash with hashPassword() and persist.
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  if (isBcryptHash(hash)) {
    return compareSync(password, hash);
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret && timingSafeHexEqual(legacySha256(password, secret), hash)) {
    return true;
  }
  return timingSafeHexEqual(legacySha256(password, LEGACY_HARDCODED_SALT), hash);
}

/** True when the stored hash should be upgraded to bcrypt after a successful login. */
export function passwordHashNeedsUpgrade(hash: string): boolean {
  return Boolean(hash) && !isBcryptHash(hash);
}
