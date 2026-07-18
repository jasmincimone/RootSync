import { permanentRedirect, redirect } from "next/navigation";

import { resolveVendorDiscoverPathForShopSlug } from "@/lib/vendorShopRedirect";

type PageParams = { params: Promise<{ slug: string }> };

/** Legacy /shops/[slug]/products → vendor listings on Discover. */
export default async function LegacyShopProductsRedirect({ params }: PageParams) {
  const { slug } = await params;
  const path = await resolveVendorDiscoverPathForShopSlug(slug);
  if (!path) {
    redirect("/discover");
  }
  permanentRedirect(`${path}#vendor-listings-heading`);
}
