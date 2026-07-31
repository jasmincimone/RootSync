import { notFound, permanentRedirect } from "next/navigation";

import { discoverVendorPath } from "@/config/discoverPaths";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";
import {
  isReservedVendorPublicSlug,
  isVendorCuidRef,
  normalizeVendorPublicSlug,
  validateVendorPublicSlug,
} from "@/lib/vendorPublicSlug";

type PageProps = {
  params: Promise<{ vendorSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function appendSearchParams(
  path: string,
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string {
  if (!searchParams) return path;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * Root vanity storefront: rootsync.io/{publicSlug} → /discover/vendors/{publicSlug}.
 * Platform routes (account, discover, login, …) win over this dynamic segment.
 */
export default async function VendorVanityRootPage({ params, searchParams }: PageProps) {
  const { vendorSlug: raw } = await params;
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || isVendorCuidRef(trimmed) || isReservedVendorPublicSlug(trimmed)) {
    notFound();
  }

  const validated = validateVendorPublicSlug(trimmed);
  if (!validated.ok || !validated.slug) {
    notFound();
  }

  const slug = validated.slug;
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      publicSlug: normalizeVendorPublicSlug(slug),
      status: VENDOR_STATUS.APPROVED,
    },
    select: { id: true, publicSlug: true },
  });

  if (!vendor?.publicSlug) {
    notFound();
  }

  const resolvedSearch = searchParams ? await searchParams : undefined;
  permanentRedirect(appendSearchParams(discoverVendorPath(vendor), resolvedSearch));
}
