import { prisma } from "@/lib/prisma";
import { discoverBookPath, discoverListingPath } from "@/config/discoverPaths";
import { growthVendorWhere } from "@/lib/growthAccess";
import { vendorFunnelPublicPath } from "@/lib/growth/publicPath";
import { GROWTH_CAMPAIGN_DESTINATION } from "@/lib/growth/roles";
import { LISTING_TYPE, VENDOR_STATUS } from "@/lib/roles";
import { isHttpUrl } from "@/lib/growth/campaignTypes";

export type CampaignDestinationOption = {
  id: string;
  name: string;
  type: string;
  url: string;
  status?: string;
  listingType?: string;
};

export async function listCampaignDestinations(args: {
  vendorProfileId: string | null;
  isPlatformScope: boolean;
}): Promise<{
  funnels: CampaignDestinationOption[];
  listings: CampaignDestinationOption[];
  bookings: CampaignDestinationOption[];
  events: CampaignDestinationOption[];
  vendorPublicSlug: string | null;
}> {
  const where = growthVendorWhere(args.vendorProfileId, args.isPlatformScope);
  const vendor = args.vendorProfileId
    ? await prisma.vendorProfile.findUnique({
        where: { id: args.vendorProfileId },
        select: { publicSlug: true },
      })
    : null;
  const vendorPublicSlug = vendor?.publicSlug ?? null;

  const [funnels, listings] = await Promise.all([
    prisma.growthFunnel.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        isActive: true,
        landingPage: { select: { slug: true, isPublished: true } },
      },
    }),
    args.vendorProfileId
      ? prisma.listing.findMany({
          where: {
            vendorProfileId: args.vendorProfileId,
            visibility: "PUBLIC",
            offering: { status: "ACTIVE" },
          },
          orderBy: { updatedAt: "desc" },
          take: 80,
          select: {
            id: true,
            title: true,
            publicSlug: true,
            listingType: true,
            offering: { select: { status: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const funnelOptions: CampaignDestinationOption[] = funnels
    .filter((funnel) => funnel.landingPage?.slug && funnel.landingPage.isPublished)
    .map((funnel) => ({
      id: funnel.id,
      name: funnel.name,
      type: GROWTH_CAMPAIGN_DESTINATION.FUNNEL,
      status: funnel.isActive ? "Active" : "Paused",
      url:
        vendorPublicSlug && funnel.landingPage?.slug
          ? vendorFunnelPublicPath(vendorPublicSlug, funnel.landingPage.slug)
          : `/account/growth/funnels`,
    }));

  const listingOptions: CampaignDestinationOption[] = listings.map((listing) => ({
    id: listing.id,
    name: listing.title,
    type: GROWTH_CAMPAIGN_DESTINATION.LISTING,
    listingType: listing.listingType,
    status: listing.offering.status === "ACTIVE" ? "Live" : listing.offering.status,
    url: discoverListingPath({ id: listing.id, publicSlug: listing.publicSlug }),
  }));

  const bookingOptions: CampaignDestinationOption[] = listings
    .filter((listing) => listing.listingType === LISTING_TYPE.SERVICE)
    .map((listing) => ({
      id: listing.id,
      name: listing.title,
      type: GROWTH_CAMPAIGN_DESTINATION.BOOKING,
      listingType: listing.listingType,
      status: listing.offering.status === "ACTIVE" ? "Live" : listing.offering.status,
      url: discoverBookPath({ id: listing.id, publicSlug: listing.publicSlug }),
    }));

  const events = listingOptions.filter((listing) => listing.listingType === LISTING_TYPE.EVENT);

  return {
    funnels: funnelOptions,
    listings: listingOptions.filter((listing) => listing.listingType !== LISTING_TYPE.SERVICE),
    bookings: bookingOptions,
    events,
    vendorPublicSlug,
  };
}

export async function resolveCampaignDestinationUrl(args: {
  vendorProfileId: string | null;
  destinationType: string | null;
  destinationId: string | null;
  destinationUrl: string | null;
}): Promise<{ ok: true; url: string; label: string } | { ok: false; error: string }> {
  if (args.destinationType === GROWTH_CAMPAIGN_DESTINATION.EXTERNAL) {
    const url = args.destinationUrl?.trim() ?? "";
    if (!isHttpUrl(url)) return { ok: false, error: "Enter a valid http(s) URL." };
    return { ok: true, url, label: url };
  }

  if (!args.destinationId) {
    return { ok: false, error: "Choose a destination." };
  }

  if (args.destinationType === GROWTH_CAMPAIGN_DESTINATION.FUNNEL) {
    const funnel = await prisma.growthFunnel.findFirst({
      where: {
        id: args.destinationId,
        ...growthVendorWhere(args.vendorProfileId, args.vendorProfileId == null),
      },
      select: {
        name: true,
        vendorProfile: { select: { publicSlug: true, status: true } },
        landingPage: { select: { slug: true, isPublished: true } },
      },
    });
    if (!funnel?.landingPage?.slug || !funnel.landingPage.isPublished) {
      return { ok: false, error: "That funnel is missing a public page. Publish it in Funnels first." };
    }
    const slug = funnel.vendorProfile?.publicSlug;
    if (!slug || funnel.vendorProfile?.status !== VENDOR_STATUS.APPROVED) {
      return {
        ok: false,
        error: "Claim a Profile URL in Vendor profile so funnel links can go live.",
      };
    }
    return {
      ok: true,
      url: vendorFunnelPublicPath(slug, funnel.landingPage.slug),
      label: funnel.name,
    };
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: args.destinationId,
      ...(args.vendorProfileId ? { vendorProfileId: args.vendorProfileId } : {}),
    },
    select: { id: true, title: true, publicSlug: true, listingType: true },
  });
  if (!listing) return { ok: false, error: "That listing is no longer available." };

  if (args.destinationType === GROWTH_CAMPAIGN_DESTINATION.BOOKING) {
    if (listing.listingType !== LISTING_TYPE.SERVICE) {
      return { ok: false, error: "Booking destinations must be a Service listing." };
    }
    return {
      ok: true,
      url: discoverBookPath({ id: listing.id, publicSlug: listing.publicSlug }),
      label: listing.title,
    };
  }

  return {
    ok: true,
    url: discoverListingPath({ id: listing.id, publicSlug: listing.publicSlug }),
    label: listing.title,
  };
}

export function absoluteCampaignUrl(pathOrUrl: string, origin: string): string {
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  const base = origin.replace(/\/$/, "");
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}
