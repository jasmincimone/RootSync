import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { hashResetToken } from "@/lib/auth-tokens";
import { validateStrongPassword } from "@/lib/passwordPolicy";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "passwordReset", {
    message: "Too many password reset attempts. Try again shortly.",
  });
  if (limited) return limited;
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    }
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    const tokenHash = hashResetToken(token);
    const row = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
    }
    const passwordHash = hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: row.userId },
        data: { usedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password:", e);
    return NextResponse.json({ error: "Reset failed." }, { status: 500 });
  }
}
