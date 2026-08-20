import { NextRequest, NextResponse } from "next/server";

import { loadBookableServiceListing, resolveBookingActor } from "@/lib/bookingAccess";
import { createServiceBookingCheckout, type IntakeAnswerInput } from "@/lib/bookingCheckout";
import { parseMarketingOptIn, resolveCheckoutMarketingOptIn } from "@/lib/checkoutMarketingOptIn";
import { campaignTokenFromRequest } from "@/lib/growth/campaignAttribution";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseIntakeAnswers(body: Record<string, unknown>): IntakeAnswerInput[] {
  if (!Array.isArray(body.intakeAnswers)) return [];
  const answers: IntakeAnswerInput[] = [];
  for (const item of body.intakeAnswers) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const questionText = typeof row.questionText === "string" ? row.questionText.trim() : "";
    const answer = typeof row.answer === "string" ? row.answer.trim() : "";
    if (!questionText || !answer) continue;
    answers.push({
      questionId: typeof row.questionId === "string" ? row.questionId : undefined,
      questionText,
      answer,
    });
  }
  return answers;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: listingId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const variantId =
      typeof body.variantId === "string" ? body.variantId.trim() : "";
    const listing = await loadBookableServiceListing(listingId, variantId || null);
    if (!listing) {
      return NextResponse.json({ error: "Service listing not found or not bookable." }, { status: 404 });
    }

    const actor = await resolveBookingActor({
      guest: { email: body.guestEmail, name: body.guestName },
      requiresAccount: Boolean(listing.offering.serviceDetails?.requiresAccountToBook),
    });
    if ("error" in actor) {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    // Guests are only identified by an email they typed, so bound how fast one
    // visitor can spin up checkouts against a vendor's calendar.
    const limited = rateLimitResponse(request, "checkout", {
      userId: actor.userId,
      scope: "service-booking",
      message: "Too many booking attempts. Try again in a few minutes.",
    });
    if (limited) return limited;

    const scheduledStartAt =
      typeof body.scheduledStartAt === "string" ? body.scheduledStartAt.trim() : "";
    if (!scheduledStartAt) {
      return NextResponse.json({ error: "Choose an appointment time." }, { status: 400 });
    }

    const intakeNotes = typeof body.intakeNotes === "string" ? body.intakeNotes : null;
    const intakeAnswers = parseIntakeAnswers(body);

    const marketingOptIn = await resolveCheckoutMarketingOptIn({
      userId: actor.userId,
      explicitOptIn: parseMarketingOptIn(body.marketingOptIn),
    });

    for (const q of listing.offering.intakeQuestions) {
      if (!q.required) continue;
      const answered = intakeAnswers.some(
        (a) => a.questionText === q.question && a.answer.trim().length > 0,
      );
      if (!answered) {
        return NextResponse.json(
          { error: `Please answer: ${q.question}` },
          { status: 400 },
        );
      }
    }

    const result = await createServiceBookingCheckout({
      listing,
      memberUserId: actor.userId,
      memberEmail: actor.email,
      memberName: actor.name,
      scheduledStartAt,
      intakeNotes,
      intakeAnswers,
      origin: request.nextUrl.origin,
      campaignToken: campaignTokenFromRequest(request),
      marketingOptIn,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[service book]", e);
    const message = e instanceof Error ? e.message : "Booking failed";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payments are not configured on this server." },
        { status: 503 },
      );
    }
    if (message.includes("not ready to accept card payments")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
