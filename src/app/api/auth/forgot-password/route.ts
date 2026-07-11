import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { responseForPrismaError } from "@/lib/prismaHttpError";
import { generateResetToken, hashResetToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { clientIpFromRequest, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = rateLimit({ key: `forgot-password:${ip}`, limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many reset requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const emailRaw = body?.email as string | undefined;
    const emailNorm = emailRaw?.trim().toLowerCase();
    if (!emailNorm) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (user?.passwordHash) {
      const raw = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(raw),
          expiresAt,
        },
      });
      const sent = await sendPasswordResetEmail(user.email, raw);
      if (!sent.ok) {
        console.error("[forgot-password] email send failed:", sent.error);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("forgot-password:", e);
    const mapped = responseForPrismaError(e);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
