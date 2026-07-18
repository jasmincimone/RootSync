import { prisma } from "@/lib/prisma";
import { growthVendorWhere } from "@/lib/growthAccess";
import {
  GROWTH_CONTACT_STATUS,
  type GrowthContactStatus,
} from "@/lib/growth/roles";

export function isGrowthContactStatus(value: string): value is GrowthContactStatus {
  return Object.values(GROWTH_CONTACT_STATUS).includes(value as GrowthContactStatus);
}

export async function listGrowthContacts(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthContact.findMany({
    where: growthVendorWhere(vendorProfileId, isPlatformScope),
    orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      tags: { include: { tag: true } },
      funnel: { select: { id: true, name: true } },
      _count: { select: { notes: true } },
    },
  });
}

export async function createGrowthContact(args: {
  vendorProfileId: string | null;
  name: string;
  email: string;
  phone?: string | null;
  status?: GrowthContactStatus;
  leadSource?: string | null;
  funnelId?: string | null;
}) {
  return prisma.growthContact.create({
    data: {
      vendorProfileId: args.vendorProfileId,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone?.trim() || null,
      status: args.status ?? GROWTH_CONTACT_STATUS.NEW_LEAD,
      leadSource: args.leadSource?.trim() || null,
      funnelId: args.funnelId || null,
      lastActivityAt: new Date(),
    },
  });
}

export async function getGrowthContactForWorkspace(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthContact.findFirst({
    where: {
      id,
      ...growthVendorWhere(vendorProfileId, isPlatformScope),
    },
    include: {
      tags: { include: { tag: true } },
      funnel: { select: { id: true, name: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function updateGrowthContact(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    status?: GrowthContactStatus;
    leadSource?: string | null;
    funnelId?: string | null;
  },
) {
  const existing = await prisma.growthContact.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.growthContact.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name.trim() } : {}),
      ...(data.email != null ? { email: data.email.trim().toLowerCase() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
      ...(data.status != null ? { status: data.status } : {}),
      ...(data.leadSource !== undefined
        ? { leadSource: data.leadSource?.trim() || null }
        : {}),
      ...(data.funnelId !== undefined ? { funnelId: data.funnelId || null } : {}),
      lastActivityAt: new Date(),
    },
  });
}

export async function deleteGrowthContact(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  const existing = await prisma.growthContact.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.growthContact.delete({ where: { id } });
  return true;
}

export async function addGrowthContactNote(args: {
  contactId: string;
  authorUserId: string;
  body: string;
  vendorProfileId: string | null;
  isPlatformScope: boolean;
}) {
  const contact = await prisma.growthContact.findFirst({
    where: {
      id: args.contactId,
      ...growthVendorWhere(args.vendorProfileId, args.isPlatformScope),
    },
    select: { id: true },
  });
  if (!contact) return null;

  const [note] = await prisma.$transaction([
    prisma.growthCrmNote.create({
      data: {
        contactId: args.contactId,
        authorUserId: args.authorUserId,
        body: args.body.trim(),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.growthContact.update({
      where: { id: args.contactId },
      data: { lastActivityAt: new Date() },
    }),
  ]);
  return note;
}
