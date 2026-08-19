import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ vendorSlug: string; campaignSlug: string }>;
};

/** Reserved public path for campaign pages. Campaigns are not public yet (ADR-007 phase 4). */
export default async function PublicVendorCampaignPage(_props: PageProps) {
  notFound();
}
