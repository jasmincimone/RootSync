import type { Offering, Listing, Prisma } from "@prisma/client";

import type { OfferingDetailsPayload } from "@/lib/offeringDetails";
import type { ServiceBookingConfigInput } from "@/lib/serviceBookingConfig";
import { serializeServiceBookingConfig, syncServiceBookingConfig } from "@/lib/serviceBookingConfig";
import {
  serializeOfferingDetails,
  swapOfferingDetailTables,
  vendorOfferingInclude,
} from "@/lib/offeringDetails";
import {
  parseOfferingVariantsFromBody,
  serializeOfferingVariants,
  syncOfferingVariants,
  type OfferingVariantInput,
} from "@/lib/offeringVariants";
import {
  LISTING_TYPE,
  LISTING_VISIBILITY,
  OFFERING_STATUS,
  SERVICE_KIND,
  VENDOR_STATUS,
  type ListingType,
  type ListingVisibility,
  type OfferingStatus,
  type ServiceKind,
} from "@/lib/roles";

export type OfferingListingInput = {
  vendorProfileId: string;
  listingType?: ListingType;
  status?: OfferingStatus;
  title: string;
  description: string;
  priceCents: number;
  category?: string | null;
  imageUrl?: string | null;
  paymentUrl?: string | null;
  productUrl?: string | null;
  vendorNotes?: string | null;
  scheduledPublishAt?: Date | null;
  serviceKind?: ServiceKind;
  details?: OfferingDetailsPayload;
  bookingConfig?: ServiceBookingConfigInput;
  variants?: OfferingVariantInput[];
};

export function isListingType(value: string): value is ListingType {
  return Object.values(LISTING_TYPE).includes(value as ListingType);
}

export function isOfferingStatus(value: string): value is OfferingStatus {
  return Object.values(OFFERING_STATUS).includes(value as OfferingStatus);
}

export function isServiceKind(value: string): value is ServiceKind {
  return Object.values(SERVICE_KIND).includes(value as ServiceKind);
}

/** Map legacy vendor API status (DRAFT / PUBLISHED / ARCHIVED) to offering status. */
export function legacyListingStatusToOfferingStatus(status: string): OfferingStatus {
  if (status === "PUBLISHED") return OFFERING_STATUS.ACTIVE;
  if (status === OFFERING_STATUS.ARCHIVED) return OFFERING_STATUS.ARCHIVED;
  if (isOfferingStatus(status)) return status;
  return OFFERING_STATUS.DRAFT;
}

export function offeringStatusToVisibility(status: OfferingStatus): ListingVisibility {
  if (status === OFFERING_STATUS.ACTIVE) return LISTING_VISIBILITY.PUBLIC;
  return LISTING_VISIBILITY.HIDDEN;
}

export function listingVisibilityForOffering(
  status: OfferingStatus,
  existingPublishedAt?: Date | null,
): { visibility: ListingVisibility; publishedAt: Date | null } {
  const visibility = offeringStatusToVisibility(status);
  if (visibility === LISTING_VISIBILITY.PUBLIC) {
    return { visibility, publishedAt: existingPublishedAt ?? new Date() };
  }
  return { visibility, publishedAt: existingPublishedAt ?? null };
}

export function resolveOfferingScheduleOnSave(args: {
  status: OfferingStatus;
  scheduledPublishAt: Date | null | undefined;
}): { status: OfferingStatus; scheduledPublishAt: Date | null } {
  const { status } = args;
  const scheduledPublishAt = args.scheduledPublishAt ?? null;

  if (status === OFFERING_STATUS.SCHEDULED) {
    if (!scheduledPublishAt) {
      throw new Error("Scheduled offerings require a publish date and time.");
    }
    if (scheduledPublishAt <= new Date()) {
      return { status: OFFERING_STATUS.ACTIVE, scheduledPublishAt: null };
    }
    return { status, scheduledPublishAt };
  }

  if (status === OFFERING_STATUS.ACTIVE) {
    return { status, scheduledPublishAt: null };
  }

  return { status, scheduledPublishAt };
}

export function syncListingFieldsFromOffering(
  offering: Pick<
    Offering,
    | "title"
    | "description"
    | "priceCents"
    | "category"
    | "imageUrl"
    | "listingType"
    | "status"
    | "vendorProfileId"
  >,
  existingPublishedAt?: Date | null,
): Prisma.ListingUpdateInput {
  const { visibility, publishedAt } = listingVisibilityForOffering(
    offering.status as OfferingStatus,
    existingPublishedAt,
  );
  return {
    listingType: offering.listingType,
    title: offering.title,
    description: offering.description,
    priceCents: offering.priceCents,
    category: offering.category,
    imageUrl: offering.imageUrl,
    visibility,
    publishedAt,
  };
}

export type VendorOfferingRow = Offering & {
  listing: Listing | null;
  productDetails: { requiresShipping: boolean; sku: string | null } | null;
  serviceDetails: {
    serviceKind: string;
    durationMinutes: number | null;
    serviceRadius: string | null;
    terms: string | null;
    bookingUrl: string | null;
    fulfillmentMethod: string;
    defaultTimeZone: string;
  } | null;
  resourceDetails: { resourceSubtype: string | null; format: string | null; fileUrl: string | null } | null;
  eventDetails: {
    startsAt: Date | null;
    endsAt: Date | null;
    location: string | null;
    venue: string | null;
    capacity: number | null;
    attendanceMode: string;
    externalJoinUrl: string | null;
    meetUrl: string | null;
    googleCalendarEventId: string | null;
  } | null;
  availabilityRules: Array<{
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    timeZone: string;
  }>;
  intakeQuestions: Array<{
    id: string;
    sortOrder: number;
    question: string;
    required: boolean;
  }>;
  variants: Array<{
    id: string;
    sortOrder: number;
    title: string;
    priceCents: number;
    durationMinutes: number | null;
    sku: string | null;
  }>;
};

/** Flatten offering + listing for vendor dashboards (listing id is the public id). */
export function serializeVendorOffering(row: VendorOfferingRow) {
  return {
    id: row.listing?.id ?? row.id,
    offeringId: row.id,
    listingType: row.listingType,
    status: row.status,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    category: row.category,
    imageUrl: row.imageUrl,
    paymentUrl: row.paymentUrl,
    productUrl: row.productUrl,
    stripeProductId: row.stripeProductId,
    stripePriceId: row.stripePriceId,
    vendorNotes: row.vendorNotes,
    scheduledPublishAt: row.scheduledPublishAt,
    visibility: row.listing?.visibility ?? LISTING_VISIBILITY.HIDDEN,
    details: serializeOfferingDetails(row),
    booking: serializeServiceBookingConfig(row),
    variants: serializeOfferingVariants(row.variants ?? []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const publicListingWhere = {
  visibility: LISTING_VISIBILITY.PUBLIC,
  offering: { status: OFFERING_STATUS.ACTIVE },
  vendorProfile: { status: VENDOR_STATUS.APPROVED },
} satisfies Prisma.ListingWhereInput;

/** For `VendorProfile.listings` relation filters (vendor already scoped). */
export const publicListingRelationWhere = {
  visibility: LISTING_VISIBILITY.PUBLIC,
  offering: { status: OFFERING_STATUS.ACTIVE },
} satisfies Prisma.ListingWhereInput;

export { vendorOfferingInclude };

export async function createOfferingWithListing(
  prisma: Prisma.TransactionClient,
  input: OfferingListingInput,
) {
  const listingType = input.listingType ?? LISTING_TYPE.PRODUCT;
  const resolved = resolveOfferingScheduleOnSave({
    status: input.status ?? OFFERING_STATUS.DRAFT,
    scheduledPublishAt: input.scheduledPublishAt ?? null,
  });

  const offering = await prisma.offering.create({
    data: {
      vendorProfileId: input.vendorProfileId,
      listingType,
      status: resolved.status,
      title: input.title,
      description: input.description,
      priceCents: input.priceCents,
      category: input.category ?? null,
      imageUrl: input.imageUrl ?? null,
      paymentUrl: input.paymentUrl ?? null,
      productUrl: input.productUrl ?? null,
      vendorNotes: input.vendorNotes ?? null,
      scheduledPublishAt: resolved.scheduledPublishAt,
      listing: {
        create: {
          vendorProfileId: input.vendorProfileId,
          listingType,
          title: input.title,
          description: input.description,
          priceCents: input.priceCents,
          category: input.category ?? null,
          imageUrl: input.imageUrl ?? null,
          ...listingVisibilityForOffering(resolved.status),
        },
      },
    },
    include: vendorOfferingInclude,
  });

  const details: OfferingDetailsPayload = { ...(input.details ?? {}) };
  if (listingType === LISTING_TYPE.SERVICE && input.serviceKind) {
    details.service = { ...details.service, serviceKind: input.serviceKind };
  }
  await swapOfferingDetailTables(prisma, offering.id, listingType, listingType, details);

  if (listingType === LISTING_TYPE.SERVICE && input.bookingConfig) {
    await syncServiceBookingConfig(prisma, offering.id, input.bookingConfig);
  }

  if (input.variants !== undefined) {
    const minVariantPrice = await syncOfferingVariants(prisma, offering.id, input.variants);
    if (minVariantPrice !== null) {
      await prisma.offering.update({
        where: { id: offering.id },
        data: { priceCents: minVariantPrice },
      });
      if (offering.listing) {
        await prisma.listing.update({
          where: { id: offering.listing.id },
          data: { priceCents: minVariantPrice },
        });
      }
    }
  }

  return prisma.offering.findUniqueOrThrow({
    where: { id: offering.id },
    include: vendorOfferingInclude,
  });
}

export async function updateOfferingAndSyncListing(
  prisma: Prisma.TransactionClient,
  offeringId: string,
  data: Prisma.OfferingUpdateInput,
  options?: {
    previousListingType?: ListingType;
    details?: OfferingDetailsPayload;
    bookingConfig?: ServiceBookingConfigInput;
    variants?: OfferingVariantInput[];
  },
) {
  const before = options?.previousListingType
    ? null
    : await prisma.offering.findUnique({
        where: { id: offeringId },
        select: { listingType: true },
      });

  const offering = await prisma.offering.update({
    where: { id: offeringId },
    data,
    include: { listing: true },
  });

  if (!offering.listing) {
    throw new Error("Offering missing public listing");
  }

  const listing = await prisma.listing.update({
    where: { id: offering.listing.id },
    data: syncListingFieldsFromOffering(offering, offering.listing.publishedAt),
  });

  const fromType = (options?.previousListingType ?? before?.listingType ?? offering.listingType) as ListingType;
  const toType = offering.listingType as ListingType;

  if (options?.details || fromType !== toType) {
    await swapOfferingDetailTables(prisma, offeringId, fromType, toType, options?.details);
  }

  if (toType === LISTING_TYPE.SERVICE && options?.bookingConfig) {
    await syncServiceBookingConfig(prisma, offeringId, options.bookingConfig);
  }

  if (options?.variants !== undefined) {
    const minVariantPrice = await syncOfferingVariants(prisma, offeringId, options.variants);
    if (minVariantPrice !== null) {
      await prisma.offering.update({
        where: { id: offeringId },
        data: { priceCents: minVariantPrice },
      });
      await prisma.listing.update({
        where: { id: offering.listing.id },
        data: { priceCents: minVariantPrice },
      });
    }
  }

  const full = await prisma.offering.findUniqueOrThrow({
    where: { id: offeringId },
    include: vendorOfferingInclude,
  });

  return { offering: full, listing };
}
