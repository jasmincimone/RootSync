import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { verifyPassword } from "@/lib/auth";

const POS_TOKEN_TYP = "rootsync-pos";
const POS_TOKEN_TTL_SEC = 60 * 60 * 12; // 12 hours

function posSecretKey() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for POS mobile tokens.");
  }
  return new TextEncoder().encode(secret);
}

export type PosMobileClaims = {
  sub: string;
  email: string;
  role: string;
  typ: typeof POS_TOKEN_TYP;
};

export async function issuePosMobileToken(args: {
  userId: string;
  email: string;
  role: string;
}): Promise<{ token: string; expiresAt: string }> {
  const expiresAtMs = Date.now() + POS_TOKEN_TTL_SEC * 1000;
  const token = await new SignJWT({
    email: args.email,
    role: args.role,
    typ: POS_TOKEN_TYP,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(args.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAtMs / 1000))
    .sign(posSecretKey());

  return { token, expiresAt: new Date(expiresAtMs).toISOString() };
}

export async function verifyPosMobileToken(token: string): Promise<PosMobileClaims | null> {
  try {
    const { payload } = await jwtVerify(token, posSecretKey());
    if (payload.typ !== POS_TOKEN_TYP) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;
    if (typeof payload.role !== "string" || !payload.role) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      typ: POS_TOKEN_TYP,
    };
  } catch {
    return null;
  }
}

export async function loginApprovedVendorForPos(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false as const, error: "Email and password required.", status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      stripeConnectAccountId: true,
      vendorProfile: { select: { id: true, status: true, displayName: true } },
    },
  });

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, error: "Invalid email or password.", status: 401 };
  }
  if (user.role !== ROLES.VENDOR && user.role !== ROLES.ADMIN) {
    return { ok: false as const, error: "Vendor account required.", status: 403 };
  }
  if (!user.vendorProfile || user.vendorProfile.status !== VENDOR_STATUS.APPROVED) {
    return { ok: false as const, error: "Approved vendor profile required.", status: 403 };
  }
  if (!user.stripeConnectAccountId) {
    return {
      ok: false as const,
      error: "Connect Stripe in Payment Hub before using the card reader.",
      status: 400,
    };
  }

  const issued = await issuePosMobileToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    ok: true as const,
    ...issued,
    userId: user.id,
    email: user.email,
    displayName: user.vendorProfile.displayName,
    connectAccountId: user.stripeConnectAccountId,
  };
}

/** Resolve vendor user id from NextAuth cookie session or POS Bearer token. */
export async function resolvePosUserId(args: {
  sessionUserId?: string | null;
  authorizationHeader?: string | null;
}): Promise<string | null> {
  if (args.sessionUserId) return args.sessionUserId;
  const header = args.authorizationHeader?.trim();
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const claims = await verifyPosMobileToken(token);
  return claims?.sub ?? null;
}
