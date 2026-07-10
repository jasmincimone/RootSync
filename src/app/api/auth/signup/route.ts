import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { validateStrongPassword } from "@/lib/passwordPolicy";
import { TWO_FACTOR_METHOD } from "@/lib/twoFactor";

export const runtime = "nodejs";

function prismaErrorMessage(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return "An account with this email already exists.";
    }
    if (e.code === "P2021") {
      return 'No matching table in this database (often wrong DATABASE_URL or migrations not applied here). Confirm Vercel **Production** env `DATABASE_URL` matches Neon, then run `npx prisma migrate deploy` with that exact URL.';
    }
    if (e.code === "P2022") {
      return "Database schema is out of date (missing column). Run `npx prisma migrate deploy` against the same DATABASE_URL the app uses, then redeploy.";
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return "Cannot connect to the database. Confirm DATABASE_URL is set in Vercel (Production) and redeploy.";
  }
  if (e instanceof Error) {
    // Postgres: relation "User" does not exist — narrow match (avoid "column X does not exist" false positives)
    if (/relation\s+["']?User["']?\s+does not exist/i.test(e.message)) {
      return 'The `User` table is missing in the database this app connects to. Same DATABASE_URL for migrate and Vercel Production? Run `npx prisma migrate deploy` with that URL.';
    }
    if (e.message.includes("Unable to open the database file")) {
      return "Can't reach the database locally. Set DATABASE_URL in .env.local and restart the dev server.";
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, agreeSmsTwoFactorTerms, marketingOptIn, agreeTerms, agreePrivacy } = body as {
      email?: string;
      password?: string;
      name?: string;
      agreeSmsTwoFactorTerms?: unknown;
      marketingOptIn?: unknown;
      agreeTerms?: unknown;
      agreePrivacy?: unknown;
    };
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (agreeTerms !== true || agreePrivacy !== true) {
      return NextResponse.json(
        {
          error: "You must agree to the Terms & Conditions and Privacy Policy to create an account.",
        },
        { status: 400 }
      );
    }
    if (agreeSmsTwoFactorTerms !== true) {
      return NextResponse.json(
        {
          error:
            "You must agree to receive security sign-in codes by email (and SMS when you enable phone verification).",
        },
        { status: 400 }
      );
    }
    const marketing = marketingOptIn === true;
    const emailNorm = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }
    const passwordHash = hashPassword(password);
    const now = new Date();
    await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        name: name?.trim() || null,
        role: ROLES.CUSTOMER,
        // Default sign-in uses email OTP — record email security consent at signup.
        twoFactorMethod: TWO_FACTOR_METHOD.EMAIL,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        consentEmailTwoFactorAt: now,
        smsTwoFactorSignupConsentAt: now,
        marketingOptIn: marketing,
        marketingOptInAt: marketing ? now : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Signup error:", e);
    const hint = prismaErrorMessage(e);
    if (hint) {
      return NextResponse.json({ error: hint }, { status: 500 });
    }
    const expose =
      process.env.NODE_ENV === "development" || process.env.SIGNUP_DEBUG_ERRORS === "1";
    return NextResponse.json(
      {
        error: expose && e instanceof Error ? e.message : "Signup failed. Check Vercel function logs or set SIGNUP_DEBUG_ERRORS=1 temporarily.",
        ...(expose && e instanceof Prisma.PrismaClientKnownRequestError ? { prismaCode: e.code } : {}),
      },
      { status: 500 }
    );
  }
}
