import type { Prisma } from "@prisma/client";

import { deleteServiceBookingConfig } from "@/lib/serviceBookingConfig";

import { normalizeProductUrl } from "@/lib/paymentUrl";
import {
  LISTING_TYPE,
  RESOURCE_SUBTYPE,
  SERVICE_KIND,
  FULFILLMENT_METHOD,
  type ListingType,
  type ResourceSubtype,
  type ServiceKind,
  type FulfillmentMethod,
} from "@/lib/roles";

export type ProductDetailsInput = {
  requiresShipping?: boolean;
  sku?: string | null;
};

export type ServiceDetailsInput = {
  serviceKind?: ServiceKind;
  durationMinutes?: number | null;
  serviceRadius?: string | null;
  terms?: string | null;
  bookingUrl?: string | null;
  fulfillmentMethod?: FulfillmentMethod;
  defaultTimeZone?: string | null;
};

export type ResourceDetailsInput = {
  resourceSubtype?: ResourceSubtype | null;
  format?: string | null;
  fileUrl?: string | null;
};

export type EventDetailsInput = {
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  venue?: string | null;
  capacity?: number | null;
};

export type OfferingDetailsPayload = {
  product?: ProductDetailsInput;
  service?: ServiceDetailsInput;
  resource?: ResourceDetailsInput;
  event?: EventDetailsInput;
};

export type SerializedOfferingDetails = {
  product: ProductDetailsInput | null;
  service: ServiceDetailsInput | null;
  resource: ResourceDetailsInput | null;
  event: EventDetailsInput | null;
};

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  throw new Error("Invalid number");
}

function parseOptionalDate(value: unknown, label: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`Invalid ${label}`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}`);
  return d;
}

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid text field");
  return value.trim() || null;
}

export function parseOfferingDetailsFromBody(
  body: Record<string, unknown>,
  listingType: ListingType,
): OfferingDetailsPayload {
  const raw = (body.details ?? body) as Record<string, unknown>;

  if (listingType === LISTING_TYPE.PRODUCT) {
    const product = (raw.product ?? raw) as Record<string, unknown>;
    return {
      product: {
        ...(product.requiresShipping !== undefined
          ? { requiresShipping: Boolean(product.requiresShipping) }
          : {}),
        sku: parseOptionalString(product.sku),
      },
    };
  }

  if (listingType === LISTING_TYPE.SERVICE) {
    const service = (raw.service ?? raw) as Record<string, unknown>;
    const kind = service.serviceKind;
    let serviceKind: ServiceKind | undefined;
    if (typeof kind === "string" && Object.values(SERVICE_KIND).includes(kind as ServiceKind)) {
      serviceKind = kind as ServiceKind;
    }
    let bookingUrl: string | null | undefined;
    if ("bookingUrl" in service) {
      bookingUrl = normalizeProductUrl(service.bookingUrl);
    }
    let fulfillmentMethod: FulfillmentMethod | undefined;
    const fm = service.fulfillmentMethod;
    if (typeof fm === "string" && Object.values(FULFILLMENT_METHOD).includes(fm as FulfillmentMethod)) {
      fulfillmentMethod = fm as FulfillmentMethod;
    }
    let defaultTimeZone: string | null | undefined;
    if ("defaultTimeZone" in service) {
      defaultTimeZone = parseOptionalString(service.defaultTimeZone);
    }
    return {
      service: {
        ...(serviceKind ? { serviceKind } : {}),
        durationMinutes: parseOptionalInt(service.durationMinutes),
        serviceRadius: parseOptionalString(service.serviceRadius),
        terms: parseOptionalString(service.terms),
        bookingUrl,
        ...(fulfillmentMethod ? { fulfillmentMethod } : {}),
        ...(defaultTimeZone !== undefined ? { defaultTimeZone } : {}),
      },
    };
  }

  if (listingType === LISTING_TYPE.RESOURCE) {
    const resource = (raw.resource ?? raw) as Record<string, unknown>;
    let fileUrl: string | null | undefined;
    if ("fileUrl" in resource) {
      fileUrl = normalizeProductUrl(resource.fileUrl);
    }
    let resourceSubtype: ResourceSubtype | null | undefined;
    const st = resource.resourceSubtype;
    if (st === null || st === "") resourceSubtype = null;
    else if (
      typeof st === "string" &&
      Object.values(RESOURCE_SUBTYPE).includes(st as ResourceSubtype)
    ) {
      resourceSubtype = st as ResourceSubtype;
    } else if (st !== undefined) {
      throw new Error("Invalid resource subtype");
    }
    return {
      resource: {
        ...(resourceSubtype !== undefined ? { resourceSubtype } : {}),
        format: parseOptionalString(resource.format),
        fileUrl,
      },
    };
  }

  const event = (raw.event ?? raw) as Record<string, unknown>;
  const startsAt = parseOptionalDate(event.startsAt, "start date");
  const endsAt = parseOptionalDate(event.endsAt, "end date");
  return {
    event: {
      ...(startsAt !== undefined
        ? { startsAt: startsAt ? startsAt.toISOString() : null }
        : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? endsAt.toISOString() : null } : {}),
      location: parseOptionalString(event.location),
      venue: parseOptionalString(event.venue),
      capacity: parseOptionalInt(event.capacity),
    },
  };
}

export function serializeOfferingDetails(
  offering: {
    listingType: string;
    productDetails: {
      requiresShipping: boolean;
      sku: string | null;
    } | null;
    serviceDetails: {
      serviceKind: string;
      durationMinutes: number | null;
      serviceRadius: string | null;
      terms: string | null;
      bookingUrl: string | null;
      fulfillmentMethod: string;
      defaultTimeZone: string;
    } | null;
    resourceDetails: {
      resourceSubtype: string | null;
      format: string | null;
      fileUrl: string | null;
    } | null;
    eventDetails: {
      startsAt: Date | null;
      endsAt: Date | null;
      location: string | null;
      venue: string | null;
      capacity: number | null;
    } | null;
  },
): SerializedOfferingDetails {
  return {
    product: offering.productDetails
      ? {
          requiresShipping: offering.productDetails.requiresShipping,
          sku: offering.productDetails.sku,
        }
      : null,
    service: offering.serviceDetails
      ? {
          serviceKind: offering.serviceDetails.serviceKind as ServiceKind,
          durationMinutes: offering.serviceDetails.durationMinutes,
          serviceRadius: offering.serviceDetails.serviceRadius,
          terms: offering.serviceDetails.terms,
          bookingUrl: offering.serviceDetails.bookingUrl,
          fulfillmentMethod: offering.serviceDetails.fulfillmentMethod as FulfillmentMethod,
          defaultTimeZone: offering.serviceDetails.defaultTimeZone,
        }
      : null,
    resource: offering.resourceDetails
      ? {
          resourceSubtype: offering.resourceDetails.resourceSubtype as ResourceSubtype | null,
          format: offering.resourceDetails.format,
          fileUrl: offering.resourceDetails.fileUrl,
        }
      : null,
    event: offering.eventDetails
      ? {
          startsAt: offering.eventDetails.startsAt?.toISOString() ?? null,
          endsAt: offering.eventDetails.endsAt?.toISOString() ?? null,
          location: offering.eventDetails.location,
          venue: offering.eventDetails.venue,
          capacity: offering.eventDetails.capacity,
        }
      : null,
  };
}

export const vendorOfferingInclude = {
  listing: true,
  productDetails: true,
  serviceDetails: true,
  resourceDetails: true,
  eventDetails: true,
  availabilityRules: {
    orderBy: [{ dayOfWeek: "asc" as const }, { startMinutes: "asc" as const }],
  },
  intakeQuestions: {
    orderBy: { sortOrder: "asc" as const },
  },
  variants: {
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.OfferingInclude;

async function deleteDetailForType(
  tx: Prisma.TransactionClient,
  offeringId: string,
  listingType: ListingType,
) {
  switch (listingType) {
    case LISTING_TYPE.PRODUCT:
      await tx.productDetails.deleteMany({ where: { offeringId } });
      break;
    case LISTING_TYPE.SERVICE:
      await tx.serviceDetails.deleteMany({ where: { offeringId } });
      await deleteServiceBookingConfig(tx, offeringId);
      break;
    case LISTING_TYPE.RESOURCE:
      await tx.resourceDetails.deleteMany({ where: { offeringId } });
      break;
    case LISTING_TYPE.EVENT:
      await tx.eventDetails.deleteMany({ where: { offeringId } });
      break;
  }
}

async function createDetailForType(
  tx: Prisma.TransactionClient,
  offeringId: string,
  listingType: ListingType,
  details?: OfferingDetailsPayload,
) {
  switch (listingType) {
    case LISTING_TYPE.PRODUCT:
      await tx.productDetails.create({
        data: {
          offeringId,
          requiresShipping: details?.product?.requiresShipping ?? true,
          sku: details?.product?.sku ?? null,
        },
      });
      break;
    case LISTING_TYPE.SERVICE:
      await tx.serviceDetails.create({
        data: {
          offeringId,
          serviceKind: details?.service?.serviceKind ?? SERVICE_KIND.ONE_TIME,
          durationMinutes: details?.service?.durationMinutes ?? null,
          serviceRadius: details?.service?.serviceRadius ?? null,
          terms: details?.service?.terms ?? null,
          bookingUrl: details?.service?.bookingUrl ?? null,
          fulfillmentMethod: details?.service?.fulfillmentMethod ?? FULFILLMENT_METHOD.VIRTUAL,
          defaultTimeZone: details?.service?.defaultTimeZone ?? "America/New_York",
        },
      });
      break;
    case LISTING_TYPE.RESOURCE:
      await tx.resourceDetails.create({
        data: {
          offeringId,
          resourceSubtype: details?.resource?.resourceSubtype ?? null,
          format: details?.resource?.format ?? null,
          fileUrl: details?.resource?.fileUrl ?? null,
        },
      });
      break;
    case LISTING_TYPE.EVENT:
      await tx.eventDetails.create({
        data: {
          offeringId,
          startsAt: details?.event?.startsAt ? new Date(details.event.startsAt) : null,
          endsAt: details?.event?.endsAt ? new Date(details.event.endsAt) : null,
          location: details?.event?.location ?? null,
          venue: details?.event?.venue ?? null,
          capacity: details?.event?.capacity ?? null,
        },
      });
      break;
  }
}

export async function upsertOfferingDetails(
  tx: Prisma.TransactionClient,
  offeringId: string,
  listingType: ListingType,
  details?: OfferingDetailsPayload,
) {
  if (!details) return;

  switch (listingType) {
    case LISTING_TYPE.PRODUCT:
      if (!details.product) return;
      await tx.productDetails.upsert({
        where: { offeringId },
        create: {
          offeringId,
          requiresShipping: details.product.requiresShipping ?? true,
          sku: details.product.sku ?? null,
        },
        update: {
          ...(details.product.requiresShipping !== undefined
            ? { requiresShipping: details.product.requiresShipping }
            : {}),
          ...(details.product.sku !== undefined ? { sku: details.product.sku } : {}),
        },
      });
      break;
    case LISTING_TYPE.SERVICE:
      if (!details.service) return;
      await tx.serviceDetails.upsert({
        where: { offeringId },
        create: {
          offeringId,
          serviceKind: details.service.serviceKind ?? SERVICE_KIND.ONE_TIME,
          durationMinutes: details.service.durationMinutes ?? null,
          serviceRadius: details.service.serviceRadius ?? null,
          terms: details.service.terms ?? null,
          bookingUrl: details.service.bookingUrl ?? null,
          fulfillmentMethod: details.service.fulfillmentMethod ?? FULFILLMENT_METHOD.VIRTUAL,
          defaultTimeZone: details.service.defaultTimeZone ?? "America/New_York",
        },
        update: {
          ...(details.service.serviceKind ? { serviceKind: details.service.serviceKind } : {}),
          ...(details.service.durationMinutes !== undefined
            ? { durationMinutes: details.service.durationMinutes }
            : {}),
          ...(details.service.serviceRadius !== undefined
            ? { serviceRadius: details.service.serviceRadius }
            : {}),
          ...(details.service.terms !== undefined ? { terms: details.service.terms } : {}),
          ...(details.service.bookingUrl !== undefined
            ? { bookingUrl: details.service.bookingUrl }
            : {}),
          ...(details.service.fulfillmentMethod !== undefined
            ? { fulfillmentMethod: details.service.fulfillmentMethod }
            : {}),
          ...(details.service.defaultTimeZone !== undefined
            ? { defaultTimeZone: details.service.defaultTimeZone ?? "America/New_York" }
            : {}),
        },
      });
      break;
    case LISTING_TYPE.RESOURCE:
      if (!details.resource) return;
      await tx.resourceDetails.upsert({
        where: { offeringId },
        create: {
          offeringId,
          resourceSubtype: details.resource.resourceSubtype ?? null,
          format: details.resource.format ?? null,
          fileUrl: details.resource.fileUrl ?? null,
        },
        update: {
          ...(details.resource.resourceSubtype !== undefined
            ? { resourceSubtype: details.resource.resourceSubtype }
            : {}),
          ...(details.resource.format !== undefined ? { format: details.resource.format } : {}),
          ...(details.resource.fileUrl !== undefined ? { fileUrl: details.resource.fileUrl } : {}),
        },
      });
      break;
    case LISTING_TYPE.EVENT:
      if (!details.event) return;
      await tx.eventDetails.upsert({
        where: { offeringId },
        create: {
          offeringId,
          startsAt: details.event.startsAt ? new Date(details.event.startsAt) : null,
          endsAt: details.event.endsAt ? new Date(details.event.endsAt) : null,
          location: details.event.location ?? null,
          venue: details.event.venue ?? null,
          capacity: details.event.capacity ?? null,
        },
        update: {
          ...(details.event.startsAt !== undefined
            ? {
                startsAt: details.event.startsAt ? new Date(details.event.startsAt) : null,
              }
            : {}),
          ...(details.event.endsAt !== undefined
            ? { endsAt: details.event.endsAt ? new Date(details.event.endsAt) : null }
            : {}),
          ...(details.event.location !== undefined ? { location: details.event.location } : {}),
          ...(details.event.venue !== undefined ? { venue: details.event.venue } : {}),
          ...(details.event.capacity !== undefined ? { capacity: details.event.capacity } : {}),
        },
      });
      break;
  }
}

export async function swapOfferingDetailTables(
  tx: Prisma.TransactionClient,
  offeringId: string,
  fromType: ListingType,
  toType: ListingType,
  details?: OfferingDetailsPayload,
) {
  if (fromType === toType) {
    await upsertOfferingDetails(tx, offeringId, toType, details);
    return;
  }
  await deleteDetailForType(tx, offeringId, fromType);
  await createDetailForType(tx, offeringId, toType, details);
}
