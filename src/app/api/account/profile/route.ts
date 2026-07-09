import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { hookProfileCompleted } from "@/lib/pulse/hooks";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_NAME = 120;
const MAX_NEIGHBORHOODS = 500;

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const data: { name?: string | null; shopNeighborhoods?: string | null } = {};

    if ("name" in body) {
      const nameRaw = body?.name;
      if (typeof nameRaw !== "string") {
        return NextResponse.json({ error: "Name must be a string" }, { status: 400 });
      }
      const name = nameRaw.trim() || null;
      if (name && name.length > MAX_NAME) {
        return NextResponse.json({ error: `Name must be at most ${MAX_NAME} characters` }, { status: 400 });
      }
      data.name = name;
    }

    if ("shopNeighborhoods" in body) {
      const raw = body?.shopNeighborhoods;
      if (raw !== null && typeof raw !== "string") {
        return NextResponse.json({ error: "Neighborhoods must be text" }, { status: 400 });
      }
      const neighborhoods = typeof raw === "string" ? raw.trim() || null : null;
      if (neighborhoods && neighborhoods.length > MAX_NEIGHBORHOODS) {
        return NextResponse.json(
          { error: `Neighborhoods must be at most ${MAX_NEIGHBORHOODS} characters` },
          { status: 400 },
        );
      }
      data.shopNeighborhoods = neighborhoods;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { name: true, shopNeighborhoods: true },
    });
    await hookProfileCompleted(session.user.id);
    return NextResponse.json({
      ok: true,
      name: updated.name,
      shopNeighborhoods: updated.shopNeighborhoods,
    });
  } catch (e) {
    console.error("account/profile PATCH:", e);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
