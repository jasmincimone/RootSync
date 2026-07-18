import { NextResponse } from "next/server";

/**
 * Simple in-memory sliding-window rate limiter for auth and abuse-prone routes.
 * Best-effort on serverless (per-instance); still blocks naive stuffing.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Named presets for common surfaces. */
export const RATE_LIMIT_PRESETS = {
  /** Sign-in prepare (password check + OTP send) */
  loginPrepare: { limit: 20, windowMs: 15 * 60 * 1000 },
  /** Account signup */
  signup: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Forgot / reset password */
  passwordReset: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** SMS / email OTP send */
  otpSend: { limit: 8, windowMs: 60 * 60 * 1000 },
  /** Geocode lookups */
  geocode: { limit: 40, windowMs: 15 * 60 * 1000 },
  /** RootSense chat completions */
  rootsenseChat: { limit: 30, windowMs: 15 * 60 * 1000 },
  /** Marketplace / Connect checkout session create */
  checkout: { limit: 20, windowMs: 15 * 60 * 1000 },
  /** File uploads (images, resources, avatars) */
  upload: { limit: 40, windowMs: 15 * 60 * 1000 },
  /** Directory ownership claim requests */
  directoryClaim: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

export function rateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const windowStart = now - args.windowMs;
  let bucket = buckets.get(args.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(args.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= args.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + args.windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: Math.max(0, args.limit - bucket.timestamps.length),
    retryAfterSec: 0,
  };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Apply a named preset. Returns a 429 response when limited, otherwise null.
 * Prefer userId in the key when authenticated so limits follow the account.
 */
export function rateLimitResponse(
  request: Request,
  preset: RateLimitPreset,
  options?: { scope?: string; userId?: string | null; message?: string },
): NextResponse | null {
  const config = RATE_LIMIT_PRESETS[preset];
  const ip = clientIpFromRequest(request);
  const subject = options?.userId?.trim() || ip;
  const scope = options?.scope ?? preset;
  const limited = rateLimit({
    key: `${scope}:${subject}`,
    limit: config.limit,
    windowMs: config.windowMs,
  });
  if (limited.ok) return null;
  return NextResponse.json(
    {
      error: options?.message ?? "Too many requests. Try again shortly.",
    },
    { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
  );
}
