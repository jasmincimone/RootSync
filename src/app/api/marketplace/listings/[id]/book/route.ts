import { NextRequest, NextResponse } from "next/server";

import { loadBookableServiceListing, requireBookingMemberSession } from "@/lib/bookingAccess";
import { createServiceBookingCheckout, type IntakeAnswerInput } from "@/lib/bookingCheckout";

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
    const gate = await requireBookingMemberSession();
    if ("error" in gate) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const { id: listingId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const variantId =
      typeof body.variantId === "string" ? body.variantId.trim() : "";
    const listing = await loadBookableServiceListing(listingId, variantId || null);
    if (!listing) {
      return NextResponse.json({ error: "Service listing not found or not bookable." }, { status: 404 });
    }

    const scheduledStartAt =
      typeof body.scheduledStartAt === "string" ? body.scheduledStartAt.trim() : "";
    if (!scheduledStartAt) {
      return NextResponse.json({ error: "Choose an appointment time." }, { status: 400 });
    }

    const intakeNotes = typeof body.intakeNotes === "string" ? body.intakeNotes : null;
    const intakeAnswers = parseIntakeAnswers(body);

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
      memberUserId: gate.userId,
      memberEmail: gate.email,
      memberName: gate.name,
      scheduledStartAt,
      intakeNotes,
      intakeAnswers,
      origin: request.nextUrl.origin,
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
