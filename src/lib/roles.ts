/** Stored in User.role (SQLite string) */
export const ROLES = {
  ADMIN: "ADMIN",
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const VENDOR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;

export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS];

export const LISTING_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

/** Vendor offering workflow — see docs/adr/ADR-001-offering-listing-model.md */
export const OFFERING_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ARCHIVED: "ARCHIVED",
} as const;

export type OfferingStatus = (typeof OFFERING_STATUS)[keyof typeof OFFERING_STATUS];

/** Public listing types — Product, Service, Resource, Event */
export const LISTING_TYPE = {
  PRODUCT: "PRODUCT",
  SERVICE: "SERVICE",
  RESOURCE: "RESOURCE",
  EVENT: "EVENT",
} as const;

export type ListingType = (typeof LISTING_TYPE)[keyof typeof LISTING_TYPE];

/** Resource subtypes when listingType is RESOURCE (classes/workshops use EVENT). */
export const RESOURCE_SUBTYPE = {
  EBOOK: "EBOOK",
  BUILD_PLAN: "BUILD_PLAN",
  GUIDE: "GUIDE",
  CHECKLIST: "CHECKLIST",
  TEMPLATE: "TEMPLATE",
} as const;

export type ResourceSubtype = (typeof RESOURCE_SUBTYPE)[keyof typeof RESOURCE_SUBTYPE];

/** Order line item fulfillment category (aligned with listing types where possible). */
export const ORDER_ITEM_TYPE = {
  PRODUCT: "product",
  SERVICE: "service",
  RESOURCE: "resource",
  EVENT: "event",
  /** @deprecated legacy shop catalog */
  DIGITAL: "digital",
  /** @deprecated legacy shop catalog */
  PHYSICAL: "physical",
  /** @deprecated pre–listing-type checkout */
  MARKETPLACE: "marketplace",
} as const;

export type OrderItemType = (typeof ORDER_ITEM_TYPE)[keyof typeof ORDER_ITEM_TYPE];

export function orderItemTypeForListingType(listingType: string): OrderItemType {
  switch (listingType) {
    case LISTING_TYPE.PRODUCT:
      return ORDER_ITEM_TYPE.PRODUCT;
    case LISTING_TYPE.SERVICE:
      return ORDER_ITEM_TYPE.SERVICE;
    case LISTING_TYPE.RESOURCE:
      return ORDER_ITEM_TYPE.RESOURCE;
    case LISTING_TYPE.EVENT:
      return ORDER_ITEM_TYPE.EVENT;
    default:
      return ORDER_ITEM_TYPE.MARKETPLACE;
  }
}

export function isResourceOrderItem(type: string): boolean {
  return type === ORDER_ITEM_TYPE.RESOURCE || type === ORDER_ITEM_TYPE.DIGITAL;
}

export function orderItemTypeLabel(type: string): string {
  if (isResourceOrderItem(type)) return "Resource";
  switch (type) {
    case ORDER_ITEM_TYPE.PRODUCT:
    case ORDER_ITEM_TYPE.PHYSICAL:
      return "Product";
    case ORDER_ITEM_TYPE.SERVICE:
      return "Service";
    case ORDER_ITEM_TYPE.EVENT:
      return "Event";
    case ORDER_ITEM_TYPE.MARKETPLACE:
      return "Listing";
    default:
      return "Item";
  }
}

/** Public discoverability */
export const LISTING_VISIBILITY = {
  PUBLIC: "PUBLIC",
  HIDDEN: "HIDDEN",
} as const;

export type ListingVisibility = (typeof LISTING_VISIBILITY)[keyof typeof LISTING_VISIBILITY];

/** Service subtypes when listingType is SERVICE */
export const SERVICE_KIND = {
  CONSULTATION: "CONSULTATION",
  ONE_TIME: "ONE_TIME",
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;

export type ServiceKind = (typeof SERVICE_KIND)[keyof typeof SERVICE_KIND];

/** How a service is delivered when listingType is SERVICE */
export const FULFILLMENT_METHOD = {
  VIRTUAL: "VIRTUAL",
  IN_PERSON: "IN_PERSON",
  HYBRID: "HYBRID",
} as const;

export type FulfillmentMethod = (typeof FULFILLMENT_METHOD)[keyof typeof FULFILLMENT_METHOD];

/**
 * How an Event is attended — see EventDetails.attendanceMode.
 * VIRTUAL_MEET uses platform Meet (Google Calendar, or Jitsi / manual URL fallback);
 * VIRTUAL_EXTERNAL is Whova/Cvent/Zoom/etc.
 */
export const EVENT_ATTENDANCE_MODE = {
  IN_PERSON: "IN_PERSON",
  VIRTUAL_MEET: "VIRTUAL_MEET",
  VIRTUAL_EXTERNAL: "VIRTUAL_EXTERNAL",
} as const;

/** Member favorites — polymorphic target on Favorite.targetType */
export const FAVORITE_TARGET_TYPE = {
  LISTING: "LISTING",
  VENDOR: "VENDOR",
  DIRECTORY: "DIRECTORY",
} as const;

export type FavoriteTargetType =
  (typeof FAVORITE_TARGET_TYPE)[keyof typeof FAVORITE_TARGET_TYPE];

export type EventAttendanceMode =
  (typeof EVENT_ATTENDANCE_MODE)[keyof typeof EVENT_ATTENDANCE_MODE];

/** Service booking lifecycle */
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/** USDA / directory listing kinds — see ADR-006 */
export const DIRECTORY_TYPE = {
  FARMERS_MARKET: "FARMERS_MARKET",
  CSA: "CSA",
  ON_FARM_MARKET: "ON_FARM_MARKET",
  FOOD_HUB: "FOOD_HUB",
  AGRITOURISM: "AGRITOURISM",
} as const;

export type DirectoryType = (typeof DIRECTORY_TYPE)[keyof typeof DIRECTORY_TYPE];

export const DIRECTORY_LISTING_STATUS = {
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
} as const;

export type DirectoryListingStatus =
  (typeof DIRECTORY_LISTING_STATUS)[keyof typeof DIRECTORY_LISTING_STATUS];

export const DIRECTORY_CLAIM_STATUS = {
  UNCLAIMED: "UNCLAIMED",
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  REJECTED: "REJECTED",
} as const;

export type DirectoryClaimStatus =
  (typeof DIRECTORY_CLAIM_STATUS)[keyof typeof DIRECTORY_CLAIM_STATUS];

export const DIRECTORY_SOURCE = {
  USDA: "USDA",
  MANUAL: "MANUAL",
} as const;

/** Community Pulse post visibility */
export const PULSE_POST_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
} as const;

export type PulsePostStatus = (typeof PULSE_POST_STATUS)[keyof typeof PULSE_POST_STATUS];

export type DirectorySource = (typeof DIRECTORY_SOURCE)[keyof typeof DIRECTORY_SOURCE];

export function isRole(value: string | undefined | null): value is Role {
  return value === ROLES.ADMIN || value === ROLES.VENDOR || value === ROLES.CUSTOMER;
}

export function toVendorStatus(value: string | null | undefined): VendorStatus | null {
  if (!value) return null;
  const allowed = Object.values(VENDOR_STATUS) as string[];
  return allowed.includes(value) ? (value as VendorStatus) : null;
}
