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

/** Service booking lifecycle */
export const BOOKING_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export function isRole(value: string | undefined | null): value is Role {
  return value === ROLES.ADMIN || value === ROLES.VENDOR || value === ROLES.CUSTOMER;
}

export function toVendorStatus(value: string | null | undefined): VendorStatus | null {
  if (!value) return null;
  const allowed = Object.values(VENDOR_STATUS) as string[];
  return allowed.includes(value) ? (value as VendorStatus) : null;
}
