import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CampaignVisitBeacon } from "@/components/growth/CampaignVisitBeacon";
import { FunnelPagePreview } from "@/components/growth/FunnelPagePreview";
import { PageBody } from "@/components/ui/PageBody";
import { getPublishedFunnelByPublicPath } from "@/lib/growth/funnels";
import { parseFunnelPageContent } from "@/lib/growth/funnelPage";
import { vendorFunnelPublicPath } from "@/lib/growth/publicPath";
import { isCampaignTrackingToken } from "@/lib/growth/campaignTracking";
import {
  isReservedVendorPublicSlug,
  isVendorCuidRef,
  validateVendorPublicSlug,
} from "@/lib/vendorPublicSlug";

type PageProps = {
  params: Promise<{ vendorSlug: string; funnelSlug: string }>;
  searchParams: Promise<{ rs_c?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vendorSlug, funnelSlug } = await params;
  const published = await getPublishedFunnelByPublicPath(vendorSlug, funnelSlug);
  if (!published) return { title: "Funnel" };
  return {
    title: published.landing.title,
    description: published.landing.headline ?? published.vendor.displayName,
  };
}

export default async function PublicVendorFunnelPage({ params, searchParams }: PageProps) {
  const { vendorSlug: rawVendor, funnelSlug: rawFunnel } = await params;
  const { rs_c: campaignToken } = await searchParams;
  const vendorSlug = rawVendor?.trim() ?? "";
  const funnelSlug = rawFunnel?.trim() ?? "";
  if (!vendorSlug || isVendorCuidRef(vendorSlug) || isReservedVendorPublicSlug(vendorSlug)) {
    notFound();
  }
  const validated = validateVendorPublicSlug(vendorSlug);
  if (!validated.ok || !validated.slug) notFound();

  const published = await getPublishedFunnelByPublicPath(validated.slug, funnelSlug);
  if (!published) notFound();

  const page = parseFunnelPageContent(published.landing.contentJson, {
    name: published.landing.funnel?.name ?? published.landing.title,
    objective: published.landing.headline,
  });

  return (
    <PageBody wide description={`From ${published.vendor.displayName}`}>
      {isCampaignTrackingToken(campaignToken) ? (
        <CampaignVisitBeacon token={campaignToken} funnelId={published.landing.funnel?.id} />
      ) : null}
      <FunnelPagePreview page={page} ctaLabel={published.landing.funnel?.ctaLabel} />
      <p className="mt-4 text-center text-xs text-fix-text-muted">
        {vendorFunnelPublicPath(published.vendor.publicSlug!, funnelSlug)}
      </p>
    </PageBody>
  );
}
