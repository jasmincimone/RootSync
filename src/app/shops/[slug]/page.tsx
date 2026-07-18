import { permanentRedirect, redirect } from "next/navigation";

import { resolveVendorDiscoverPathForShopSlug } from "@/lib/vendorShopRedirect";

type PageParams = { params: Promise<{ slug: string }> };

/** Legacy Fix Collective / pitch URLs → Discover vendor storefront. */
export default async function LegacyShopRedirect({ params }: PageParams) {
  const { slug } = await params;
  const path = await resolveVendorDiscoverPathForShopSlug(slug);
  if (!path) {
    redirect("/discover");
  }
  permanentRedirect(path);
}
