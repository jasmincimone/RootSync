import { formatPrice } from "@/lib/format";
import { LISTING_TYPE } from "@/lib/roles";

const LABELS: Record<string, string> = {
  [LISTING_TYPE.PRODUCT]: "Product",
  [LISTING_TYPE.SERVICE]: "Service",
  [LISTING_TYPE.RESOURCE]: "Resource",
  [LISTING_TYPE.EVENT]: "Event",
};

export function listingTypeLabel(listingType: string): string {
  return LABELS[listingType] ?? "Listing";
}

export function offeringStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    ACTIVE: "Active",
    PAUSED: "Paused",
    ARCHIVED: "Archived",
    PUBLISHED: "Active",
  };
  return labels[status] ?? status;
}

export function listingDisplayPrice(priceCents: number, variantCount: number): string {
  if (variantCount > 1) return `From ${formatPrice(priceCents)}`;
  return formatPrice(priceCents);
}
