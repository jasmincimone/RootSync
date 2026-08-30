import { prisma } from "@/lib/prisma";
import type { BookableServiceListing } from "@/lib/bookingAccess";
import { resolveVendorEmail } from "@/lib/bookingAccess";
import { parseSlotSelection, resolveBookingPriceCents, slotIsAvailable } from "@/lib/bookingSlots";
import { discoverBookPath } from "@/config/discoverPaths";
import {
  appBaseUrl,
  fetchConnectAccountStatus,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import { connectDestinationPaymentIntentData } from "@/lib/stripeCheckoutWebhook";
import { BOOKING_STATUS } from "@/lib/roles";
import { campaignCheckoutMetadata } from "@/lib/growth/campaignAttribution";
import { clampServiceBookingQuantity } from "@/lib/serviceBookingQuantity";

export type IntakeAnswerInput = {
  questionId?: string;
  questionText: string;
  answer: string;
};

export type CreateServiceBookingInput = {
  listing: BookableServiceListing;
  /** Null for guest bookings — the booking is then identified by memberEmail. */
  memberUserId: string | null;
  memberEmail: string;
  memberName: string | null;
  /** One ISO start time per session. Single-session checkouts pass a one-element array. */
  scheduledStartAts: string[];
  intakeNotes?: string | null;
  intakeAnswers?: IntakeAnswerInput[];
  origin: string;
  campaignToken?: string | null;
  marketingOptIn?: boolean;
};

function listingImageUrl(imageUrl: string | null, baseUrl: string): string[] | undefined {
  if (!imageUrl?.trim()) return undefined;
  try {
    return [new URL(imageUrl, baseUrl).href];
  } catch {
    return undefined;
  }
}

function slotsOverlap(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date },
): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

export async function createServiceBookingCheckout(
  input: CreateServiceBookingInput,
): Promise<{ url: string; bookingIds: string[]; orderId: string }> {
  const { listing, memberUserId, memberEmail, memberName, origin } = input;
  const variantId = listing.selectedVariantId ?? null;
  const quantity = clampServiceBookingQuantity(input.scheduledStartAts.length);
  const scheduledStartAts = input.scheduledStartAts.slice(0, quantity);

  if (scheduledStartAts.length === 0) {
    throw new Error("Choose at least one appointment time.");
  }

  const parsedSlots = scheduledStartAts.map((startAt) => {
    const slot = parseSlotSelection(startAt, listing, variantId);
    if (!slot) throw new Error("Invalid appointment time.");
    return slot;
  });

  for (let i = 0; i < parsedSlots.length; i++) {
    for (let j = i + 1; j < parsedSlots.length; j++) {
      if (slotsOverlap(parsedSlots[i]!, parsedSlots[j]!)) {
        throw new Error("Choose a different time for each session — times cannot overlap.");
      }
    }
  }

  const booked = await prisma.booking.findMany({
    where: {
      listingId: listing.id,
      status: BOOKING_STATUS.CONFIRMED,
    },
    select: { scheduledStartAt: true, scheduledEndAt: true },
  });
  const confirmedRanges = booked.map((b) => ({
    startAt: b.scheduledStartAt,
    endAt: b.scheduledEndAt,
  }));

  for (let i = 0; i < parsedSlots.length; i++) {
    const slot = parsedSlots[i]!;
    const blocked = [
      ...confirmedRanges,
      ...parsedSlots
        .filter((_, j) => j !== i)
        .map((other) => ({ startAt: other.startAt, endAt: other.endAt })),
    ];
    if (!slotIsAvailable(slot.startAt, slot.endAt, listing, blocked, variantId)) {
      throw new Error("That time slot is no longer available. Please choose another.");
    }
  }

  const serviceDetails = listing.offering.serviceDetails!;
  const priceCents = resolveBookingPriceCents(listing);
  const totalCents = priceCents * parsedSlots.length;
  const variant = variantId
    ? listing.offering.variants.find((v) => v.id === variantId)
    : null;
  const lineName = variant
    ? `${listing.title} — ${variant.title}`
    : `${listing.title} (service booking)`;
  const vendorEmail = resolveVendorEmail(listing);
  const baseUrl = appBaseUrl(origin);

  const checkout = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: memberUserId ?? null,
        email: memberEmail,
        status: "pending",
        marketingOptIn: input.marketingOptIn ?? false,
        subtotalCents: totalCents,
        totalCents,
        items: {
          create: {
            productId: listing.id,
            name:
              parsedSlots.length > 1
                ? `${lineName} · ${parsedSlots.length} sessions`
                : lineName,
            quantity: parsedSlots.length,
            priceCents,
            type: "service_booking",
            listingId: listing.id,
            variantId: variant?.id ?? null,
          },
        },
      },
    });

    const bookingIds: string[] = [];
    for (const slot of parsedSlots) {
      const createdBooking = await tx.booking.create({
        data: {
          listingId: listing.id,
          offeringId: listing.offeringId,
          variantId: variant?.id ?? null,
          vendorProfileId: listing.vendorProfileId,
          memberUserId,
          memberEmail,
          memberName,
          vendorEmail,
          status: BOOKING_STATUS.PENDING_PAYMENT,
          serviceKind: serviceDetails.serviceKind,
          fulfillmentMethod: serviceDetails.fulfillmentMethod,
          scheduledStartAt: slot.startAt,
          scheduledEndAt: slot.endAt,
          timeZone: slot.timeZone,
          priceCents,
          intakeNotes: input.intakeNotes?.trim() || null,
          orderId: order.id,
          intakeAnswers: input.intakeAnswers?.length
            ? {
                create: input.intakeAnswers.map((a) => ({
                  questionText: a.questionText.trim(),
                  answer: a.answer.trim(),
                })),
              }
            : undefined,
        },
      });
      bookingIds.push(createdBooking.id);
    }

    return { order, bookingIds };
  });

  const connectAccountId = listing.vendorProfile.user.stripeConnectAccountId;
  let useConnect = false;
  if (connectAccountId) {
    try {
      const onboarding = await fetchConnectAccountStatus(connectAccountId);
      useConnect = onboarding.readyToProcessPayments;
    } catch {
      useConnect = false;
    }
  }

  if (!useConnect || !connectAccountId) {
    throw new Error(
      "This vendor is not ready to accept card payments on RootSync yet. Complete Stripe Connect in Payment Hub, or share a payment link.",
    );
  }

  const stripe = getConnectStripeClient();
  const images = listingImageUrl(listing.imageUrl, baseUrl);
  const applicationFeeCents = platformApplicationFeeCents(totalCents);
  const primaryBookingId = checkout.bookingIds[0]!;

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer_email: memberEmail,
    line_items: [
      {
        quantity: parsedSlots.length,
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: lineName,
            description:
              parsedSlots.length > 1
                ? `${parsedSlots.length} service sessions · ${listing.description.slice(0, 360) || listing.title}`
                : `Service booking · ${listing.description.slice(0, 400) || listing.title}`,
            images,
          },
        },
      },
    ],
    success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}&booking=1`,
    cancel_url: `${baseUrl}${discoverBookPath(listing, variantId)}`,
    metadata: {
      orderId: checkout.order.id,
      bookingId: primaryBookingId,
      bookingIds: JSON.stringify(checkout.bookingIds),
      bookingCount: String(checkout.bookingIds.length),
      listingId: listing.id,
      vendorProfileId: listing.vendorProfileId,
      type: "service_booking",
      ...(await campaignCheckoutMetadata(input.campaignToken)),
    },
    payment_intent_data: connectDestinationPaymentIntentData(
      totalCents,
      connectAccountId,
      applicationFeeCents,
    ),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await prisma.order.update({
    where: { id: checkout.order.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session missing URL");
  }

  return {
    url: session.url,
    bookingIds: checkout.bookingIds,
    orderId: checkout.order.id,
  };
}
