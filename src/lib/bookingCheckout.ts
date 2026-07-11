import { prisma } from "@/lib/prisma";
import type { BookableServiceListing } from "@/lib/bookingAccess";
import { resolveVendorEmail } from "@/lib/bookingAccess";
import { parseSlotSelection, resolveBookingPriceCents, slotIsAvailable } from "@/lib/bookingSlots";
import {
  appBaseUrl,
  fetchConnectAccountStatus,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import { BOOKING_STATUS } from "@/lib/roles";

export type IntakeAnswerInput = {
  questionId?: string;
  questionText: string;
  answer: string;
};

export type CreateServiceBookingInput = {
  listing: BookableServiceListing;
  memberUserId: string;
  memberEmail: string;
  memberName: string | null;
  scheduledStartAt: string;
  intakeNotes?: string | null;
  intakeAnswers?: IntakeAnswerInput[];
  origin: string;
};

function listingImageUrl(imageUrl: string | null, baseUrl: string): string[] | undefined {
  if (!imageUrl?.trim()) return undefined;
  try {
    return [new URL(imageUrl, baseUrl).href];
  } catch {
    return undefined;
  }
}

export async function createServiceBookingCheckout(
  input: CreateServiceBookingInput,
): Promise<{ url: string; bookingId: string; orderId: string }> {
  const { listing, memberUserId, memberEmail, memberName, origin } = input;
  const variantId = listing.selectedVariantId ?? null;
  const slot = parseSlotSelection(input.scheduledStartAt, listing, variantId);
  if (!slot) {
    throw new Error("Invalid appointment time.");
  }

  const booked = await prisma.booking.findMany({
    where: {
      listingId: listing.id,
      status: { in: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED] },
      scheduledStartAt: { lt: slot.endAt },
      scheduledEndAt: { gt: slot.startAt },
    },
    select: { scheduledStartAt: true, scheduledEndAt: true },
  });

  if (!slotIsAvailable(slot.startAt, slot.endAt, listing, booked.map((b) => ({
    startAt: b.scheduledStartAt,
    endAt: b.scheduledEndAt,
  })), variantId)) {
    throw new Error("That time slot is no longer available. Please choose another.");
  }

  const serviceDetails = listing.offering.serviceDetails!;
  const priceCents = resolveBookingPriceCents(listing);
  const variant = variantId
    ? listing.offering.variants.find((v) => v.id === variantId)
    : null;
  const lineName = variant
    ? `${listing.title} — ${variant.title}`
    : `${listing.title} (service booking)`;
  const vendorEmail = resolveVendorEmail(listing);
  const baseUrl = appBaseUrl(origin);

  const booking = await prisma.$transaction(async (tx) => {
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

    const order = await tx.order.create({
      data: {
        userId: memberUserId,
        email: memberEmail,
        status: "pending",
        subtotalCents: priceCents,
        totalCents: priceCents,
        items: {
          create: {
            productId: listing.id,
            name: lineName,
            quantity: 1,
            priceCents,
            type: "service_booking",
            listingId: listing.id,
            variantId: variant?.id ?? null,
          },
        },
        booking: { connect: { id: createdBooking.id } },
      },
    });

    await tx.booking.update({
      where: { id: createdBooking.id },
      data: { orderId: order.id },
    });

    return { booking: createdBooking, order };
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
  const applicationFeeCents = platformApplicationFeeCents(priceCents);

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer_email: memberEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: lineName,
            description: `Service booking · ${listing.description.slice(0, 400) || listing.title}`,
            images,
          },
        },
      },
    ],
    success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}&booking=1`,
    cancel_url: variantId
      ? `${baseUrl}/discover/listings/${listing.id}/book?variant=${encodeURIComponent(variantId)}`
      : `${baseUrl}/discover/listings/${listing.id}/book`,
    metadata: {
      orderId: booking.order.id,
      bookingId: booking.booking.id,
      listingId: listing.id,
      vendorProfileId: listing.vendorProfileId,
      type: "service_booking",
    },
    payment_intent_data: {
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: connectAccountId },
    },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: booking.order.id },
      data: { stripeSessionId: session.id },
    }),
    prisma.booking.update({
      where: { id: booking.booking.id },
      data: { stripeSessionId: session.id },
    }),
  ]);

  if (!session.url) {
    throw new Error("Stripe Checkout session missing URL");
  }

  return { url: session.url, bookingId: booking.booking.id, orderId: booking.order.id };
}
