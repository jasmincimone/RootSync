import { PULSE_EVENT_TYPES } from "@/lib/pulse/eventTypes";
import { recordPulseEventOnce } from "@/lib/pulse/recordEvent";
import { toPulseEarnedPayload } from "@/lib/pulse/toastMessages";
import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/roles";

const REVIEWABLE_ORDER_STATUSES = ["paid", "shipped", "delivered"] as const;

export type VendorPulseSummary = {
  averageRating: number | null;
  reviewCount: number;
  label: string;
};

export type VendorPulseReviewRow = {
  id: string;
  pulseRating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
  reviewerName: string | null;
  listingTitle: string | null;
};

export type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
  vendorProfileId?: string;
  listingId?: string | null;
};

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

function formatAverage(avg: number | null, count: number): string {
  if (count === 0 || avg == null) return "No Pulses yet";
  return `${avg.toFixed(1)} Pulses`;
}

/** Aggregate Pulse rating for a vendor profile. */
export async function loadVendorPulseSummary(
  vendorProfileId: string,
): Promise<VendorPulseSummary> {
  try {
    const agg = await prisma.vendorPulseReview.aggregate({
      where: { vendorProfileId },
      _avg: { pulseRating: true },
      _count: true,
    });

    const reviewCount = agg._count;
    const averageRating = agg._avg.pulseRating;

    return {
      averageRating,
      reviewCount,
      label: formatAverage(averageRating, reviewCount),
    };
  } catch {
    return { averageRating: null, reviewCount: 0, label: "No Pulses yet" };
  }
}

/** Recent public reviews for a vendor. */
export async function loadVendorPulseReviews(
  vendorProfileId: string,
  limit = 10,
): Promise<VendorPulseReviewRow[]> {
  try {
    const rows = await prisma.vendorPulseReview.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        pulseRating: true,
        title: true,
        body: true,
        createdAt: true,
        reviewer: { select: { name: true } },
        listing: { select: { title: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      pulseRating: r.pulseRating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      reviewerName: r.reviewer.name,
      listingTitle: r.listing?.title ?? null,
    }));
  } catch {
    return [];
  }
}

async function resolveOrderVendor(
  orderId: string,
): Promise<{ vendorProfileId: string; listingId: string | null; vendorUserId: string } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      items: {
        take: 1,
        select: {
          listingId: true,
          listing: {
            select: {
              id: true,
              vendorProfileId: true,
              vendorProfile: { select: { userId: true } },
            },
          },
        },
      },
      booking: {
        select: {
          vendorProfileId: true,
          listingId: true,
          vendorProfile: { select: { userId: true } },
        },
      },
    },
  });

  if (order?.booking) {
    return {
      vendorProfileId: order.booking.vendorProfileId,
      listingId: order.booking.listingId,
      vendorUserId: order.booking.vendorProfile.userId,
    };
  }

  const item = order?.items[0];
  if (!item?.listing) return null;

  return {
    vendorProfileId: item.listing.vendorProfileId,
    listingId: item.listing.id,
    vendorUserId: item.listing.vendorProfile.userId,
  };
}

/** Check whether a member can leave a Pulse review for a transaction. */
export async function checkVendorReviewEligibility(input: {
  reviewerUserId: string;
  vendorProfileId: string;
  orderId?: string | null;
  bookingId?: string | null;
}): Promise<ReviewEligibility> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: input.vendorProfileId },
    select: { userId: true },
  });
  if (!vendor) return { eligible: false, reason: "Vendor not found" };
  if (vendor.userId === input.reviewerUserId) {
    return { eligible: false, reason: "You cannot review your own vendor profile" };
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        memberUserId: true,
        vendorProfileId: true,
        listingId: true,
        status: true,
        vendorPulseReview: { select: { id: true } },
      },
    });
    if (!booking) return { eligible: false, reason: "Booking not found" };
    if (booking.memberUserId !== input.reviewerUserId) {
      return { eligible: false, reason: "This booking is not yours" };
    }
    if (booking.vendorProfileId !== input.vendorProfileId) {
      return { eligible: false, reason: "Booking does not match this vendor" };
    }
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return { eligible: false, reason: "Reviews open after the service is completed" };
    }
    if (booking.vendorPulseReview) {
      return { eligible: false, reason: "You already gave Pulse for this booking" };
    }
    return {
      eligible: true,
      vendorProfileId: booking.vendorProfileId,
      listingId: booking.listingId,
    };
  }

  if (input.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        userId: true,
        email: true,
        status: true,
        vendorPulseReview: { select: { id: true } },
      },
    });
    if (!order) return { eligible: false, reason: "Order not found" };

    const user = await prisma.user.findUnique({
      where: { id: input.reviewerUserId },
      select: { email: true },
    });
    const ownsOrder =
      order.userId === input.reviewerUserId ||
      (!!user?.email && order.email.toLowerCase() === user.email.toLowerCase());
    if (!ownsOrder) return { eligible: false, reason: "This order is not yours" };

    if (!REVIEWABLE_ORDER_STATUSES.includes(order.status as (typeof REVIEWABLE_ORDER_STATUSES)[number])) {
      return { eligible: false, reason: "Reviews open after your purchase is confirmed" };
    }
    if (order.vendorPulseReview) {
      return { eligible: false, reason: "You already gave Pulse for this order" };
    }

    const resolved = await resolveOrderVendor(input.orderId);
    if (!resolved || resolved.vendorProfileId !== input.vendorProfileId) {
      return { eligible: false, reason: "Order does not match this vendor" };
    }

    return {
      eligible: true,
      vendorProfileId: resolved.vendorProfileId,
      listingId: resolved.listingId,
    };
  }

  return { eligible: false, reason: "A completed order or booking is required" };
}

export type CreateVendorReviewInput = {
  reviewerUserId: string;
  vendorProfileId: string;
  pulseRating: number;
  title?: string | null;
  body?: string | null;
  orderId?: string | null;
  bookingId?: string | null;
};

export async function createVendorPulseReview(
  input: CreateVendorReviewInput,
): Promise<
  | { ok: true; reviewId: string; pulseEarned: ReturnType<typeof toPulseEarnedPayload> }
  | { ok: false; error: string }
> {
  const rating = clampRating(input.pulseRating);
  const eligibility = await checkVendorReviewEligibility({
    reviewerUserId: input.reviewerUserId,
    vendorProfileId: input.vendorProfileId,
    orderId: input.orderId,
    bookingId: input.bookingId,
  });

  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason ?? "Not eligible to review" };
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: input.vendorProfileId },
    select: { userId: true },
  });
  if (!vendor) return { ok: false, error: "Vendor not found" };

  const review = await prisma.vendorPulseReview.create({
    data: {
      vendorProfileId: input.vendorProfileId,
      reviewerUserId: input.reviewerUserId,
      listingId: eligibility.listingId ?? null,
      orderId: input.orderId ?? null,
      bookingId: input.bookingId ?? null,
      pulseRating: rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
    },
    select: { id: true },
  });

  const reviewResult = await recordPulseEventOnce({
    userId: input.reviewerUserId,
    eventType: PULSE_EVENT_TYPES.VENDOR_REVIEW_GIVEN,
    relatedEntityType: "vendor_review",
    relatedEntityId: review.id,
    metadata: { vendorProfileId: input.vendorProfileId, pulseRating: rating },
  });

  await recordPulseEventOnce({
    userId: vendor.userId,
    eventType: PULSE_EVENT_TYPES.VENDOR_PULSE_RECEIVED,
    relatedEntityType: "vendor_review",
    relatedEntityId: review.id,
    pulseValue: rating * 2,
    metadata: { pulseRating: rating, fromUserId: input.reviewerUserId },
  });

  const pulseEarned = toPulseEarnedPayload(reviewResult.event!, {
    vendorProfileId: input.vendorProfileId,
    pulseRating: rating,
  });

  return { ok: true, reviewId: review.id, pulseEarned };
}

/** Pending review opportunities for the signed-in member. */
export async function loadPendingVendorReviews(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const [orders, bookings] = await Promise.all([
    prisma.order.findMany({
      where: {
        vendorPulseReview: null,
        status: { in: [...REVIEWABLE_ORDER_STATUSES] },
        OR: [
          { userId },
          ...(user?.email ? [{ email: user.email }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        items: {
          take: 1,
          select: {
            listing: {
              select: {
                id: true,
                title: true,
                vendorProfileId: true,
                vendorProfile: { select: { displayName: true, userId: true } },
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            vendorProfileId: true,
            listing: { select: { title: true } },
            vendorProfile: { select: { displayName: true, userId: true } },
          },
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        memberUserId: userId,
        status: BOOKING_STATUS.COMPLETED,
        vendorPulseReview: null,
      },
      orderBy: { scheduledStartAt: "desc" },
      take: 20,
      select: {
        id: true,
        scheduledStartAt: true,
        listingId: true,
        vendorProfileId: true,
        listing: { select: { title: true } },
        vendorProfile: { select: { displayName: true, userId: true } },
      },
    }),
  ]);

  const seen = new Set<string>();
  const pending: {
    vendorProfileId: string;
    vendorName: string;
    listingTitle: string | null;
    orderId?: string;
    bookingId?: string;
    date: Date;
  }[] = [];

  for (const order of orders) {
    if (order.booking) {
      const key = `booking-order:${order.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (order.booking.vendorProfile.userId === userId) continue;
      pending.push({
        vendorProfileId: order.booking.vendorProfileId,
        vendorName: order.booking.vendorProfile.displayName,
        listingTitle: order.booking.listing?.title ?? null,
        orderId: order.id,
        date: order.createdAt,
      });
      continue;
    }

    const listing = order.items[0]?.listing;
    if (!listing || listing.vendorProfile.userId === userId) continue;
    const key = `order:${order.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pending.push({
      vendorProfileId: listing.vendorProfileId,
      vendorName: listing.vendorProfile.displayName,
      listingTitle: listing.title,
      orderId: order.id,
      date: order.createdAt,
    });
  }

  for (const booking of bookings) {
    if (booking.vendorProfile.userId === userId) continue;
    const key = `booking:${booking.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pending.push({
      vendorProfileId: booking.vendorProfileId,
      vendorName: booking.vendorProfile.displayName,
      listingTitle: booking.listing?.title ?? null,
      bookingId: booking.id,
      date: booking.scheduledStartAt,
    });
  }

  return pending.sort((a, b) => b.date.getTime() - a.date.getTime());
}
