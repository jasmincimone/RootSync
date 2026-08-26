import { prisma } from "@/lib/prisma";
import { growthVendorWhere } from "@/lib/growthAccess";

export type GrowthWorkspaceSearchHit = {
  kind: "contact" | "campaign" | "funnel";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const MAX_PER_KIND = 6;

export async function searchGrowthWorkspace(args: {
  vendorProfileId: string | null;
  isPlatformScope: boolean;
  query: string;
}): Promise<GrowthWorkspaceSearchHit[]> {
  const q = args.query.trim();
  if (q.length < 1) return [];

  const scope = growthVendorWhere(args.vendorProfileId, args.isPlatformScope);
  const contains = { contains: q, mode: "insensitive" as const };

  const [contacts, campaigns, funnels] = await Promise.all([
    prisma.growthContact.findMany({
      where: {
        ...scope,
        OR: [{ name: contains }, { email: contains }, { phone: contains }],
      },
      orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      take: MAX_PER_KIND,
      select: { id: true, name: true, email: true, status: true },
    }),
    prisma.growthEmailCampaign.findMany({
      where: {
        ...scope,
        OR: [{ name: contains }, { subject: contains }, { description: contains }],
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_PER_KIND,
      select: { id: true, name: true, status: true, subject: true },
    }),
    prisma.growthFunnel.findMany({
      where: {
        ...scope,
        OR: [{ name: contains }, { description: contains }, { objective: contains }],
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_PER_KIND,
      select: { id: true, name: true, isActive: true, objective: true },
    }),
  ]);

  const hits: GrowthWorkspaceSearchHit[] = [
    ...contacts.map((row) => ({
      kind: "contact" as const,
      id: row.id,
      title: row.name,
      subtitle: row.email,
      href: `/account/growth/crm/${row.id}`,
    })),
    ...campaigns.map((row) => ({
      kind: "campaign" as const,
      id: row.id,
      title: row.name,
      subtitle: row.subject || row.status,
      href: `/account/growth/campaigns/${row.id}`,
    })),
    ...funnels.map((row) => ({
      kind: "funnel" as const,
      id: row.id,
      title: row.name,
      subtitle: row.objective || (row.isActive ? "Active" : "Inactive"),
      href: `/account/growth/funnels`,
    })),
  ];

  return hits;
}
