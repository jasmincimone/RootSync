import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { parseShopSlugParam } from "@/lib/adminShop";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role as string | undefined;
  const vendorShopSlugRaw = body.vendorShopSlug as string | null | undefined;

  if (vendorShopSlugRaw !== undefined) {
    const profile = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ error: "User has no vendor profile" }, { status: 404 });
    }

    let shopSlug: string | null = null;
    if (vendorShopSlugRaw !== null && vendorShopSlugRaw !== "") {
      const parsed = parseShopSlugParam(vendorShopSlugRaw);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid platform shop" }, { status: 400 });
      }
      shopSlug = parsed;

      const taken = await prisma.vendorProfile.findFirst({
        where: { shopSlug: parsed, NOT: { userId } },
      });
      if (taken) {
        return NextResponse.json(
          { error: "That platform shop is already assigned to another vendor." },
          { status: 409 },
        );
      }
    }

    await prisma.vendorProfile.update({
      where: { userId },
      data: { shopSlug },
    });

    if (role === undefined) {
      return NextResponse.json({ ok: true });
    }
  }

  if (role !== undefined) {
    if (role !== ROLES.ADMIN && role !== ROLES.VENDOR && role !== ROLES.CUSTOMER) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (userId === session.user.id && role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  if (role === undefined && vendorShopSlugRaw === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
