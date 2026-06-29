import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTwoFactorMethod, TWO_FACTOR_METHOD } from "@/lib/twoFactor";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      imageUrl: true,
      shopNeighborhoods: true,
      createdAt: true,
      twoFactorMethod: true,
      phone: true,
      phoneVerifiedAt: true,
      consentSmsTwoFactorAt: true,
      consentEmailTwoFactorAt: true,
      smsTwoFactorSignupConsentAt: true,
      marketingOptIn: true,
      marketingOptInAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    shopNeighborhoods: user.shopNeighborhoods,
    createdAt: user.createdAt.toISOString(),
    twoFactorMethod: user.twoFactorMethod || TWO_FACTOR_METHOD.NONE,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt?.toISOString() ?? null,
    consentSmsTwoFactorAt: user.consentSmsTwoFactorAt?.toISOString() ?? null,
    consentEmailTwoFactorAt: user.consentEmailTwoFactorAt?.toISOString() ?? null,
    smsTwoFactorSignupConsentAt: user.smsTwoFactorSignupConsentAt?.toISOString() ?? null,
    marketingOptIn: user.marketingOptIn,
    marketingOptInAt: user.marketingOptInAt?.toISOString() ?? null,
    emailOtpConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const tfaRaw = body?.twoFactorMethod;
    const marketingRaw = body?.marketingOptIn;
    const agreeEmailTwoFactor = body?.agreeEmailTwoFactor === true;
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

    const hasTfa = tfaRaw !== undefined && tfaRaw !== null;
    const hasMarketing = marketingRaw !== undefined && marketingRaw !== null;

    if (!hasTfa && !hasMarketing) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    if (hasMarketing && typeof marketingRaw !== "boolean") {
      return NextResponse.json({ error: "marketingOptIn must be a boolean." }, { status: 400 });
    }

    if (hasTfa) {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          passwordHash: true,
          phone: true,
          phoneVerifiedAt: true,
          consentEmailTwoFactorAt: true,
          consentSmsTwoFactorAt: true,
        },
      });
      if (!u?.passwordHash) {
        return NextResponse.json({ error: "Password sign-in is not set for this account." }, { status: 400 });
      }
      if (!currentPassword || !verifyPassword(currentPassword, u.passwordHash)) {
        return NextResponse.json(
          { error: "Enter your current password to change two-factor settings." },
          { status: 401 }
        );
      }
      if (typeof tfaRaw !== "string" || !isTwoFactorMethod(tfaRaw)) {
        return NextResponse.json({ error: "Invalid twoFactorMethod." }, { status: 400 });
      }
      if (tfaRaw === TWO_FACTOR_METHOD.SMS) {
        if (!u?.phone || !u.phoneVerifiedAt) {
          return NextResponse.json(
            { error: "Verify your phone number before enabling SMS two-factor." },
            { status: 400 }
          );
        }
      }
      const hasSecurityOtpConsent =
        Boolean(u?.consentEmailTwoFactorAt) || Boolean(u?.consentSmsTwoFactorAt);
      if (tfaRaw === TWO_FACTOR_METHOD.EMAIL && !agreeEmailTwoFactor && !hasSecurityOtpConsent) {
        return NextResponse.json(
          {
            error:
              "Agree to receive security one-time codes by email, or verify a phone and agree to SMS security messages first (either is enough for now).",
          },
          { status: 400 }
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (hasTfa) {
      data.twoFactorMethod = tfaRaw;
      if (tfaRaw === TWO_FACTOR_METHOD.EMAIL && agreeEmailTwoFactor) {
        data.consentEmailTwoFactorAt = new Date();
      }
    }
    if (hasMarketing) {
      data.marketingOptIn = marketingRaw;
      data.marketingOptInAt = marketingRaw ? new Date() : null;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account/settings PATCH:", e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
