import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { responseForPrismaError } from "@/lib/prismaHttpError";
import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from "@/lib/auth";
import { generateOtpDigits, hashOtpCode } from "@/lib/auth-tokens";
import { sendLoginOtpEmail } from "@/lib/email";
import { clientIpFromRequest, rateLimit } from "@/lib/rateLimit";
import { ROLES } from "@/lib/roles";
import { isSmsSendAvailable, sendSms } from "@/lib/sms";
import { CHALLENGE_CHANNEL, CHALLENGE_PURPOSE, TWO_FACTOR_METHOD } from "@/lib/twoFactor";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = rateLimit({ key: `login-prepare:${ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const emailRaw = body?.email as string | undefined;
    const password = typeof body?.password === "string" ? body.password : "";
    const emailNorm = emailRaw?.trim().toLowerCase();
    if (!emailNorm || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (passwordHashNeedsUpgrade(user.passwordHash)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashPassword(password) },
        });
      } catch (upgradeErr) {
        console.warn("[login-prepare] password hash upgrade failed", upgradeErr);
      }
    }
    const storedTf = user.twoFactorMethod || TWO_FACTOR_METHOD.NONE;
    const tf = user.role === ROLES.ADMIN && storedTf === TWO_FACTOR_METHOD.NONE
      ? TWO_FACTOR_METHOD.EMAIL
      : storedTf;
    if (tf === TWO_FACTOR_METHOD.NONE) {
      return NextResponse.json({ skipTwoFactor: true });
    }
    if (tf === TWO_FACTOR_METHOD.SMS && (!user.phone || !user.phoneVerifiedAt)) {
      return NextResponse.json(
        {
          error:
            "SMS two-factor is enabled but your phone is not verified. Turn off SMS two-factor in Account → Settings, or contact support.",
        },
        { status: 400 }
      );
    }
    if (tf === TWO_FACTOR_METHOD.SMS && !user.consentSmsTwoFactorAt) {
      return NextResponse.json(
        {
          error:
            "SMS sign-in requires consent to security text messages. Open Account → Settings, agree to SMS for two-factor, and send a new verification code.",
        },
        { status: 403 }
      );
    }
    const hasEmailOtpConsent =
      Boolean(user.consentEmailTwoFactorAt) ||
      Boolean(user.consentSmsTwoFactorAt) ||
      // Legacy signups recorded SMS-terms checkbox but not consentEmailTwoFactorAt.
      Boolean(user.smsTwoFactorSignupConsentAt);
    if (tf === TWO_FACTOR_METHOD.EMAIL && !hasEmailOtpConsent) {
      // Password already verified — record email OTP consent so the user is not locked out
      // of Account Settings (chicken-and-egg). They are requesting a code to their own email.
      await prisma.user.update({
        where: { id: user.id },
        data: { consentEmailTwoFactorAt: new Date() },
      });
    }
    if (tf === TWO_FACTOR_METHOD.EMAIL) {
      const key = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM;
      if (!key || !from) {
        return NextResponse.json(
          {
            error:
              "Email sign-in codes are not configured on this server. Set RESEND_API_KEY and EMAIL_FROM, then restart/redeploy.",
          },
          { status: 503 }
        );
      }
    }
    if (tf === TWO_FACTOR_METHOD.SMS && !isSmsSendAvailable()) {
      return NextResponse.json(
        {
          error:
            "SMS sign-in codes are not configured on this server. Add Twilio env vars (see .env.example) or use local dev without VERCEL for a terminal-only bypass.",
        },
        { status: 503 }
      );
    }

    await prisma.loginChallenge.deleteMany({
      where: {
        userId: user.id,
        purpose: CHALLENGE_PURPOSE.LOGIN,
        consumedAt: null,
      },
    });

    const challengeId = randomUUID();
    const code = generateOtpDigits();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const channel =
      tf === TWO_FACTOR_METHOD.SMS ? CHALLENGE_CHANNEL.SMS : CHALLENGE_CHANNEL.EMAIL;

    await prisma.loginChallenge.create({
      data: {
        id: challengeId,
        userId: user.id,
        purpose: CHALLENGE_PURPOSE.LOGIN,
        channel,
        codeHash: hashOtpCode(code, challengeId),
        expiresAt,
      },
    });

    let smsUsedDevBypass = false;
    let emailUsedDevBypass = false;
    if (channel === CHALLENGE_CHANNEL.EMAIL) {
      const sent = await sendLoginOtpEmail(user.email, code);
      if (!sent.ok) {
        await prisma.loginChallenge.delete({ where: { id: challengeId } }).catch(() => {});
        return NextResponse.json(
          { error: sent.error || "Could not send sign-in code." },
          { status: 503 }
        );
      }
      emailUsedDevBypass = Boolean(sent.devBypass);
    } else {
      const sent = await sendSms(user.phone!, `Your sign-in code is ${code}. It expires in 10 minutes.`);
      if (!sent.ok) {
        await prisma.loginChallenge.delete({ where: { id: challengeId } }).catch(() => {});
        return NextResponse.json(
          { error: sent.error || "Could not send SMS." },
          { status: 503 }
        );
      }
      smsUsedDevBypass = sent.devBypass;
    }

    return NextResponse.json({
      needsTwoFactor: true,
      challengeId,
      channel,
      ...(emailUsedDevBypass
        ? {
            hint: "Email delivery is not configured in this environment — check the terminal running `next dev` for your sign-in code.",
          }
        : {}),
      ...(smsUsedDevBypass
        ? {
            hint: "Twilio is not configured — check the terminal running `next dev` for your sign-in code (no text was sent).",
          }
        : {}),
    });
  } catch (e) {
    console.error("login-prepare:", e);
    const mapped = responseForPrismaError(e);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
