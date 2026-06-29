import Link from "next/link";

import { publicListingRelationWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export async function MenuFeaturedVendors() {
  const vendors = await prisma.vendorProfile.findMany({
    where: { status: VENDOR_STATUS.APPROVED },
    include: {
      listings: {
        where: publicListingRelationWhere,
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const featured = [...vendors]
    .sort((a, b) => b.listings.length - a.listings.length)
    .slice(0, 6);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 border-t border-fix-border/15 pt-6">
      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
        Featured vendors
      </div>
      <ul className="mt-2 grid gap-0.5">
        {featured.map((vendor) => (
          <li key={vendor.id}>
            <Link
              href={`/discover/vendors/${vendor.id}`}
              className="block rounded-xl px-3 py-2 text-sm font-medium text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover"
            >
              {vendor.displayName}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/discover"
        className="mt-2 block rounded-xl px-3 py-2 text-sm font-medium text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading"
      >
        View all vendors →
      </Link>
    </section>
  );
}
