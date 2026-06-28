import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { publicListingWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import {
  BOOKING_STATUS,
  LISTING_TYPE,
  ROLES,
  VENDOR_STATUS,
  type BookingStatus,
} from "@/lib/roles";

/** Members (signed-in users) and vendors may book services; visitors browse only. */
export function canBookServices(role: string | undefined | null): boolean {
  return role === ROLES.CUSTOMER || role === ROLES.VENDOR || role === ROLES.ADMIN;
}

export async function requireBookingMemberSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return { error: "Sign in to book a service." as const, status: 401 as const };
  }
  if (!canBookServices(session.user.role)) {
    return { error: "Your account cannot book services." as const, status: 403 as const };
  }
  return {
    userId: session.user.id,
    email: session.user.email.trim(),
    name: session.user.name?.trim() || null,
    role: session.user.role,
  };
}

export type BookableServiceListing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  listingType: string;
  offeringId: string;
  vendorProfileId: string;
  vendorProfile: {
    id: string;
    displayName: string;
    contactEmail: string | null;
    user: {
      id: string;
      email: string;
      stripeConnectAccountId: string | null;
    };
  };
  offering: {
    serviceDetails: {
      serviceKind: string;
      durationMinutes: number | null;
      fulfillmentMethod: string;
      defaultTimeZone: string;
      terms: string | null;
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
      title: string;
      priceCents: number;
      durationMinutes: number | null;
      sku: string | null;
    }>;
  };
  selectedVariantId?: string | null;
};

export async function loadBookableServiceListing(
  listingId: string,
  variantId?: string | null,
): Promise<BookableServiceListing | null> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      listingType: LISTING_TYPE.SERVICE,
      ...publicListingWhere,
      priceCents: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      listingType: true,
      offeringId: true,
      vendorProfileId: true,
      vendorProfile: {
        select: {
          id: true,
          displayName: true,
          contactEmail: true,
          user: {
            select: {
              id: true,
              email: true,
              stripeConnectAccountId: true,
            },
          },
        },
      },
      offering: {
        select: {
          serviceDetails: {
            select: {
              serviceKind: true,
              durationMinutes: true,
              fulfillmentMethod: true,
              defaultTimeZone: true,
              terms: true,
            },
          },
          availabilityRules: {
            select: {
              dayOfWeek: true,
              startMinutes: true,
              endMinutes: true,
              timeZone: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
          },
          intakeQuestions: {
            select: {
              id: true,
              sortOrder: true,
              question: true,
              required: true,
            },
            orderBy: { sortOrder: "asc" },
          },
          variants: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              priceCents: true,
              durationMinutes: true,
              sku: true,
            },
          },
        },
      },
    },
  });
  if (!listing?.offering.serviceDetails) return null;
  if (listing.offering.variants.length > 0) {
    if (!variantId || !listing.offering.variants.some((v) => v.id === variantId)) {
      return null;
    }
  }
  return { ...listing, selectedVariantId: variantId ?? null } as BookableServiceListing;
}

export function resolveVendorEmail(listing: BookableServiceListing): string {
  return (
    listing.vendorProfile.contactEmail?.trim() ||
    listing.vendorProfile.user.email.trim()
  );
}

export function isActiveBookingStatus(status: string): boolean {
  return status === BOOKING_STATUS.PENDING_PAYMENT || status === BOOKING_STATUS.CONFIRMED;
}

export function bookingStatusLabel(status: BookingStatus | string): string {
  switch (status) {
    case BOOKING_STATUS.PENDING_PAYMENT:
      return "Pending payment";
    case BOOKING_STATUS.CONFIRMED:
      return "Confirmed";
    case BOOKING_STATUS.CANCELLED:
      return "Cancelled";
    case BOOKING_STATUS.COMPLETED:
      return "Completed";
    default:
      return status;
  }
}

export async function memberOwnsBooking(bookingId: string, userId: string): Promise<boolean> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, memberUserId: userId },
    select: { id: true },
  });
  return !!booking;
}

export async function vendorOwnsBooking(
  bookingId: string,
  vendorProfileId: string,
): Promise<boolean> {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorProfileId },
    select: { id: true },
  });
  return !!booking;
}

export async function requireApprovedVendorForBookings(userId: string) {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  if (!profile || profile.status !== VENDOR_STATUS.APPROVED) {
    return { error: "Approved vendor profile required." as const, status: 403 as const };
  }
  return { vendorProfileId: profile.id };
}
