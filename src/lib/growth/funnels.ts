import { prisma } from "@/lib/prisma";
import { growthVendorWhere } from "@/lib/growthAccess";
import { GROWTH_FUNNEL_STEP_TYPE } from "@/lib/growth/roles";

export function isGrowthFunnelStepType(value: string): boolean {
  return Object.values(GROWTH_FUNNEL_STEP_TYPE).includes(
    value as (typeof GROWTH_FUNNEL_STEP_TYPE)[keyof typeof GROWTH_FUNNEL_STEP_TYPE],
  );
}

export async function listGrowthFunnels(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthFunnel.findMany({
    where: growthVendorWhere(vendorProfileId, isPlatformScope),
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function createGrowthFunnel(args: {
  vendorProfileId: string | null;
  name: string;
  description?: string | null;
  objective?: string | null;
  steps?: Array<{ stepType: string; label: string }>;
}) {
  const steps = args.steps?.length
    ? args.steps
    : [
        { stepType: GROWTH_FUNNEL_STEP_TYPE.LANDING_PAGE, label: "Landing page" },
        { stepType: GROWTH_FUNNEL_STEP_TYPE.EMAIL_SEQUENCE, label: "Nurture emails" },
        { stepType: GROWTH_FUNNEL_STEP_TYPE.CTA, label: "Call to action" },
      ];

  return prisma.growthFunnel.create({
    data: {
      vendorProfileId: args.vendorProfileId,
      name: args.name.trim(),
      description: args.description?.trim() || null,
      objective: args.objective?.trim() || null,
      isActive: true,
      steps: {
        create: steps.map((step, index) => ({
          sortOrder: index,
          stepType: step.stepType,
          label: step.label.trim(),
        })),
      },
    },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function getGrowthFunnelForWorkspace(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function updateGrowthFunnel(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  data: {
    name?: string;
    description?: string | null;
    objective?: string | null;
    isActive?: boolean;
  },
) {
  const existing = await prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.growthFunnel.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.objective !== undefined
        ? { objective: data.objective?.trim() || null }
        : {}),
      ...(data.isActive != null ? { isActive: data.isActive } : {}),
    },
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
      _count: { select: { contacts: true } },
    },
  });
}

export async function deleteGrowthFunnel(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  const existing = await prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.growthFunnel.delete({ where: { id } });
  return true;
}
