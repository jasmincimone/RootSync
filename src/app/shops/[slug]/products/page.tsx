import { redirect } from "next/navigation";

import { resolveVendorIdForShopSlug } from "@/lib/vendorShopRedirect";

type PageParams = { params: Promise<{ slug: string }> };

export default async function LegacyShopProductsRedirect({ params }: PageParams) {
  const { slug } = await params;
  const vendorId = await resolveVendorIdForShopSlug(slug);
  if (!vendorId) {
    redirect("/marketplace");
  }
  redirect(`/marketplace/vendors/${vendorId}#vendor-listings-heading`);
}
