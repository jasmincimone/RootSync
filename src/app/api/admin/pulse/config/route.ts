import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { loadAdminPulseConfig } from "@/lib/pulse/adminConfig";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await loadAdminPulseConfig();
  return NextResponse.json(config);
}

const patchSchema = z.object({
  section: z.enum([
    "eventWeights",
    "categories",
    "thresholds",
    "platformWeights",
    "platformThresholds",
    "announcements",
  ]),
  updates: z.array(z.record(z.unknown())),
});

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

  const { section, updates } = parsed.data;

  try {
    const { prisma } = await import("@/lib/prisma");

    if (section === "eventWeights") {
      for (const row of updates) {
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.pulseScoreWeight.update({
          where: { id },
          data: {
            ...(row.pulseValue !== undefined ? { pulseValue: Number(row.pulseValue) } : {}),
            ...(row.enabled !== undefined ? { enabled: Boolean(row.enabled) } : {}),
            ...(row.description !== undefined
              ? { description: row.description ? String(row.description) : null }
              : {}),
          },
        });
      }
    } else if (section === "categories") {
      for (const row of updates) {
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.pulseCategory.update({
          where: { id },
          data: {
            ...(row.label !== undefined ? { label: String(row.label) } : {}),
            ...(row.enabled !== undefined ? { enabled: Boolean(row.enabled) } : {}),
            ...(row.sortOrder !== undefined ? { sortOrder: Number(row.sortOrder) } : {}),
          },
        });
      }
    } else if (section === "thresholds") {
      for (const row of updates) {
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.pulseThreshold.update({
          where: { id },
          data: {
            ...(row.minScore !== undefined ? { minScore: Number(row.minScore) } : {}),
            ...(row.label !== undefined ? { label: String(row.label) } : {}),
            ...(row.emoji !== undefined ? { emoji: row.emoji ? String(row.emoji) : null } : {}),
            ...(row.sortOrder !== undefined ? { sortOrder: Number(row.sortOrder) } : {}),
          },
        });
      }
    } else if (section === "platformWeights") {
      for (const row of updates) {
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.platformPulseWeight.update({
          where: { id },
          data: {
            ...(row.weight !== undefined ? { weight: Number(row.weight) } : {}),
            ...(row.enabled !== undefined ? { enabled: Boolean(row.enabled) } : {}),
            ...(row.description !== undefined
              ? { description: row.description ? String(row.description) : null }
              : {}),
          },
        });
      }
    } else if (section === "platformThresholds") {
      for (const row of updates) {
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.platformPulseThreshold.update({
          where: { id },
          data: {
            ...(row.minValue !== undefined ? { minValue: Number(row.minValue) } : {}),
            ...(row.label !== undefined ? { label: String(row.label) } : {}),
            ...(row.emoji !== undefined ? { emoji: row.emoji ? String(row.emoji) : null } : {}),
            ...(row.sortOrder !== undefined ? { sortOrder: Number(row.sortOrder) } : {}),
          },
        });
      }
    } else if (section === "announcements") {
      for (const row of updates) {
        if (row._delete && row.id) {
          await prisma.publicDashboardAnnouncement.delete({ where: { id: String(row.id) } });
          continue;
        }
        if (row._create) {
          await prisma.publicDashboardAnnouncement.create({
            data: {
              title: String(row.title ?? "Announcement"),
              body: row.body ? String(row.body) : null,
              href: row.href ? String(row.href) : null,
              enabled: row.enabled !== undefined ? Boolean(row.enabled) : true,
              sortOrder: row.sortOrder !== undefined ? Number(row.sortOrder) : 0,
            },
          });
          continue;
        }
        const id = String(row.id ?? "");
        if (!id) continue;
        await prisma.publicDashboardAnnouncement.update({
          where: { id },
          data: {
            ...(row.title !== undefined ? { title: String(row.title) } : {}),
            ...(row.body !== undefined ? { body: row.body ? String(row.body) : null } : {}),
            ...(row.href !== undefined ? { href: row.href ? String(row.href) : null } : {}),
            ...(row.enabled !== undefined ? { enabled: Boolean(row.enabled) } : {}),
            ...(row.sortOrder !== undefined ? { sortOrder: Number(row.sortOrder) } : {}),
          },
        });
      }
    }
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const config = await loadAdminPulseConfig();
  return NextResponse.json(config);
}
