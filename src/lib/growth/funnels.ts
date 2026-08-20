import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { growthVendorWhere } from "@/lib/growthAccess";
import { DEFAULT_GROWTH_FUNNEL_STEPS } from "@/lib/growth/funnelGuide";
import {
  parseFunnelPageContent,
  serializeFunnelPageContent,
  type FunnelPageContent,
} from "@/lib/growth/funnelPage";
import { resolveGrowthPublicSlug, normalizeGrowthPublicSlug } from "@/lib/growth/publicPath";
import { setDiscoverCheckoutFunnel } from "@/lib/growth/orderContacts";
import { GROWTH_FUNNEL_STEP_TYPE } from "@/lib/growth/roles";
import { VENDOR_STATUS } from "@/lib/roles";
import { normalizeVendorPublicSlug } from "@/lib/vendorPublicSlug";

const funnelInclude = {
  steps: { orderBy: { sortOrder: "asc" as const } },
  landingPage: {
    select: { id: true, slug: true, headline: true, contentJson: true, isPublished: true },
  },
  _count: { select: { contacts: true } },
};

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
    include: funnelInclude,
  });
}

async function growthSlugTaken(args: {
  vendorProfileId: string | null;
  slug: string;
  excludeLandingPageId?: string | null;
}): Promise<boolean> {
  const existing = await prisma.growthLandingPage.findFirst({
    where: {
      vendorProfileId: args.vendorProfileId,
      slug: args.slug,
      ...(args.excludeLandingPageId ? { id: { not: args.excludeLandingPageId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

function requireGrowthSlug(raw: string, fallbackName: string): string {
  const resolved = resolveGrowthPublicSlug(raw, fallbackName);
  if (!resolved.ok) throw new Error(resolved.error);
  return resolved.slug;
}

export class GrowthFunnelSlugTakenError extends Error {
  constructor() {
    super("That funnel URL is already taken. Choose another.");
    this.name = "GrowthFunnelSlugTakenError";
  }
}

export async function createGrowthFunnel(args: {
  vendorProfileId: string | null;
  name: string;
  description?: string | null;
  objective?: string | null;
  ctaLabel?: string | null;
  publicSlug?: string | null;
  page?: FunnelPageContent;
  steps?: Array<{ stepType: string; label: string }>;
}) {
  const slug = requireGrowthSlug(args.publicSlug ?? "", args.name);
  if (await growthSlugTaken({ vendorProfileId: args.vendorProfileId, slug })) {
    throw new GrowthFunnelSlugTakenError();
  }

  const steps = args.steps?.length
    ? args.steps
    : DEFAULT_GROWTH_FUNNEL_STEPS.map((step) => ({
        stepType: step.stepType,
        label: step.label,
      }));
  const page = serializeFunnelPageContent(
    parseFunnelPageContent(args.page, {
      name: args.name,
      objective: args.objective,
      description: args.description,
    }),
  );

  return prisma.$transaction(async (tx) => {
    const funnel = await tx.growthFunnel.create({
      data: {
        vendorProfileId: args.vendorProfileId,
        name: args.name.trim(),
        description: args.description?.trim() || null,
        objective: args.objective?.trim() || null,
        ctaLabel: args.ctaLabel?.trim() || null,
        isActive: true,
        steps: {
          create: steps.map((step, index) => ({
            sortOrder: index,
            stepType: step.stepType,
            label: step.label.trim(),
          })),
        },
      },
    });

    const landing = await tx.growthLandingPage.create({
      data: {
        vendorProfileId: args.vendorProfileId,
        funnelId: funnel.id,
        slug,
        title: args.name.trim(),
        headline: args.objective?.trim() || null,
        contentJson: page as Prisma.InputJsonValue,
        isPublished: true,
      },
    });

    return tx.growthFunnel.update({
      where: { id: funnel.id },
      data: { landingPageId: landing.id },
      include: funnelInclude,
    });
  });
}

export async function getGrowthFunnelForWorkspace(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    include: funnelInclude,
  });
}

export async function getPublishedFunnelByPublicPath(vendorSlug: string, funnelSlug: string) {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      publicSlug: normalizeVendorPublicSlug(vendorSlug),
      status: VENDOR_STATUS.APPROVED,
    },
    select: { id: true, displayName: true, publicSlug: true },
  });
  if (!vendor?.publicSlug) return null;

  const landing = await prisma.growthLandingPage.findFirst({
    where: {
      vendorProfileId: vendor.id,
      slug: normalizeGrowthPublicSlug(funnelSlug),
      isPublished: true,
    },
    select: {
      title: true,
      headline: true,
      contentJson: true,
      funnel: { select: { id: true, name: true, ctaLabel: true } },
    },
  });
  if (!landing) return null;

  return { vendor, landing };
}

export async function updateGrowthFunnel(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  data: {
    name?: string;
    description?: string | null;
    objective?: string | null;
    ctaLabel?: string | null;
    publicSlug?: string | null;
    isActive?: boolean;
    assignDiscoverCheckout?: boolean;
    page?: FunnelPageContent;
  },
) {
  const existing = await prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true, vendorProfileId: true, landingPageId: true, name: true },
  });
  if (!existing) return null;

  if (data.assignDiscoverCheckout != null && existing.vendorProfileId) {
    await setDiscoverCheckoutFunnel({
      funnelId: id,
      vendorProfileId: existing.vendorProfileId,
      enabled: data.assignDiscoverCheckout,
    });
  }

  const title = (data.name ?? existing.name).trim();
  let nextSlug: string | undefined;
  if (data.publicSlug !== undefined || (data.page && !existing.landingPageId)) {
    nextSlug = requireGrowthSlug(data.publicSlug ?? "", title);
    if (
      await growthSlugTaken({
        vendorProfileId: existing.vendorProfileId,
        slug: nextSlug,
        excludeLandingPageId: existing.landingPageId,
      })
    ) {
      throw new GrowthFunnelSlugTakenError();
    }
  }

  if (data.page) {
    const page = serializeFunnelPageContent(data.page);
    if (existing.landingPageId) {
      await prisma.growthLandingPage.update({
        where: { id: existing.landingPageId },
        data: {
          title,
          headline: data.objective !== undefined ? data.objective?.trim() || null : undefined,
          contentJson: page as Prisma.InputJsonValue,
          funnelId: id,
          isPublished: true,
          ...(nextSlug ? { slug: nextSlug } : {}),
        },
      });
    } else {
      const landing = await prisma.growthLandingPage.create({
        data: {
          vendorProfileId: existing.vendorProfileId,
          funnelId: id,
          slug: nextSlug ?? requireGrowthSlug("", title),
          title,
          headline: data.objective?.trim() || null,
          contentJson: page as Prisma.InputJsonValue,
          isPublished: true,
        },
      });
      await prisma.growthFunnel.update({
        where: { id },
        data: { landingPageId: landing.id },
      });
    }
  } else if (nextSlug && existing.landingPageId) {
    await prisma.growthLandingPage.update({
      where: { id: existing.landingPageId },
      data: {
        slug: nextSlug,
        ...(data.name != null ? { title } : {}),
        ...(data.objective !== undefined ? { headline: data.objective?.trim() || null } : {}),
      },
    });
  }

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
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel?.trim() || null } : {}),
      ...(data.isActive != null ? { isActive: data.isActive } : {}),
    },
    include: funnelInclude,
  });
}

export async function deleteGrowthFunnel(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  const existing = await prisma.growthFunnel.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true, landingPageId: true },
  });
  if (!existing) return false;
  await prisma.growthFunnel.update({
    where: { id },
    data: { landingPageId: null },
  });
  await prisma.growthLandingPage.deleteMany({
    where: {
      OR: [
        { funnelId: id },
        ...(existing.landingPageId ? [{ id: existing.landingPageId }] : []),
      ],
    },
  });
  await prisma.growthFunnel.delete({ where: { id } });
  return true;
}

/** Move CRM contacts onto a funnel. A contact can only belong to one funnel. */
export async function assignContactsToGrowthFunnel(args: {
  funnelId: string;
  vendorProfileId: string | null;
  isPlatformScope: boolean;
  contactIds?: string[];
  allContacts?: boolean;
}): Promise<{ assigned: number } | null> {
  const funnel = await prisma.growthFunnel.findFirst({
    where: {
      id: args.funnelId,
      ...growthVendorWhere(args.vendorProfileId, args.isPlatformScope),
    },
    select: { id: true },
  });
  if (!funnel) return null;

  const vendorWhere = growthVendorWhere(args.vendorProfileId, args.isPlatformScope);

  if (args.allContacts) {
    const result = await prisma.growthContact.updateMany({
      where: vendorWhere,
      data: { funnelId: args.funnelId, lastActivityAt: new Date() },
    });
    return { assigned: result.count };
  }

  const contactIds = [...new Set((args.contactIds ?? []).filter(Boolean))];
  if (contactIds.length === 0) return { assigned: 0 };

  const result = await prisma.growthContact.updateMany({
    where: { ...vendorWhere, id: { in: contactIds } },
    data: { funnelId: args.funnelId, lastActivityAt: new Date() },
  });
  return { assigned: result.count };
}
