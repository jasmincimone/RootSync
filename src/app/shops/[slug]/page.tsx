import { redirect } from "next/navigation";

import { resolveVendorDiscoverPathForShopSlug } from "@/lib/vendorShopRedirect";

type PageParams = { params: Promise<{ slug: string }> };

export default async function LegacyShopRedirect({ params }: PageParams) {
  const { slug } = await params;
  const path = await resolveVendorDiscoverPathForShopSlug(slug);
  if (!path) {
    redirect("/discover");
  }
  redirect(path);
}
