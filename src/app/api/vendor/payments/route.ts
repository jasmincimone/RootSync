import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { normalizePaymentUrl } from "@/lib/paymentUrl";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

async function requireApprovedVendor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, status: true, paymentLinkUrl: true },
  });

  if (!profile) {
    return { error: NextResponse.json({ error: "No vendor profile" }, { status: 404 }) };
  }

  if (
    session.user.role !== ROLES.VENDOR ||
    profile.status !== VENDOR_STATUS.APPROVED
  ) {
    return { error: NextResponse.json({ error: "Vendor access required" }, { status: 403 }) };
  }

  return { session, profile };
}

export async function GET() {
  const auth = await requireApprovedVendor();
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    paymentLinkUrl: auth.profile.paymentLinkUrl,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApprovedVendor();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const raw = body as Record<string, unknown>;

  if (!("paymentLinkUrl" in raw)) {
    return NextResponse.json({ error: "paymentLinkUrl is required" }, { status: 400 });
  }

  let paymentLinkUrl: string | null;
  try {
    paymentLinkUrl = normalizePaymentUrl(raw.paymentLinkUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payment link";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  await prisma.vendorProfile.update({
    where: { userId: auth.session.user.id },
    data: { paymentLinkUrl },
  });

  return NextResponse.json({ ok: true, paymentLinkUrl });
}
