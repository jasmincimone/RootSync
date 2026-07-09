import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { loadAllDashboardWidgets } from "@/lib/pulse/ticker";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      enabled: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }),
  ),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const widgets = await loadAllDashboardWidgets();
  return NextResponse.json({ widgets });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      parsed.data.updates.map((update) =>
        prisma.publicDashboardWidget.update({
          where: { id: update.id },
          data: {
            ...(update.enabled !== undefined ? { enabled: update.enabled } : {}),
            ...(update.sortOrder !== undefined ? { sortOrder: update.sortOrder } : {}),
          },
        }),
      ),
    );
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const widgets = await loadAllDashboardWidgets();
  return NextResponse.json({ widgets });
}
