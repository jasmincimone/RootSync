import { randomUUID } from "crypto";

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { generateOtpDigits, hashOtpCode } from "@/lib/auth-tokens";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForSms } from "@/lib/phone";
import { isSmsSendAvailable, sendSms } from "@/lib/sms";
import { CHALLENGE_CHANNEL, CHALLENGE_PURPOSE } from "@/lib/twoFactor";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimitResponse(request, "otpSend", {
    userId: session.user.id,
    message: "Too many verification texts. Try again shortly.",
  });
  if (limited) return limited;
  try {
    const body = await request.json();
    if (body?.agreeToSmsTwoFactor !== true) {
      return NextResponse.json(
        {
          error:
            "You must agree to receive security text messages (verification and sign-in codes) before we can send an SMS.",
        },
        { status: 400 }
      );
    }
    const marketingOptIn = body?.marketingOptIn === true;
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Enter your current password to update phone security settings." },
        { status: 401 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Password sign-in is not set for this account." }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }
    const phone = normalizePhoneForSms(typeof body?.phone === "string" ? body.phone : "");
    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Enter a valid mobile number: E.164 with + and country code (e.g. +15551234567), or 10-digit US/CA without +1.",
        },
        { status: 400 }
      );
    }
    if (!isSmsSendAvailable()) {
      return NextResponse.json(
        {
          error:
            "SMS is not configured on this server. Add Twilio (see .env.example), or use local dev without VERCEL to print codes in the terminal.",
        },
        { status: 503 }
      );
    }

    await prisma.loginChallenge.deleteMany({
      where: {
        userId: session.user.id,
        purpose: CHALLENGE_PURPOSE.PHONE_VERIFY,
        consumedAt: null,
      },
    });

    const challengeId = randomUUID();
    const code = generateOtpDigits();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.loginChallenge.create({
      data: {
        id: challengeId,
        userId: session.user.id,
        purpose: CHALLENGE_PURPOSE.PHONE_VERIFY,
        channel: CHALLENGE_CHANNEL.SMS,
        codeHash: hashOtpCode(code, challengeId),
        targetPhone: phone,
        expiresAt,
      },
    });

    const sent = await sendSms(phone, `Your verification code is ${code}. It expires in 10 minutes.`);
    if (!sent.ok) {
      await prisma.loginChallenge.delete({ where: { id: challengeId } }).catch(() => {});
      return NextResponse.json({ error: sent.error || "Could not send SMS." }, { status: 503 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        consentSmsTwoFactorAt: new Date(),
        marketingOptIn,
        marketingOptInAt: marketingOptIn ? new Date() : null,
      },
    });

    return NextResponse.json({
      challengeId,
      smsDelivery: sent.devBypass ? "dev_bypass" : "sms",
      /** Echo back so the user can confirm Twilio is texting the number they intended. */
      sentTo: phone,
      ...(sent.devBypass || !sent.twilioMessageSid
        ? {}
        : {
            twilioMessageSid: sent.twilioMessageSid,
          }),
    });
  } catch (e) {
    console.error("phone/send-code:", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
