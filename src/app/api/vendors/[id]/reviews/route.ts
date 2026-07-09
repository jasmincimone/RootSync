import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import {
  createVendorPulseReview,
  loadVendorPulseReviews,
  loadVendorPulseSummary,
} from "@/lib/pulse/vendorReviews";

const postSchema = z.object({
  pulseRating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  orderId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: vendorProfileId } = await params;
  const [summary, reviews] = await Promise.all([
    loadVendorPulseSummary(vendorProfileId),
    loadVendorPulseReviews(vendorProfileId, 20),
  ]);

  return NextResponse.json({ summary, reviews });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to give Pulse" }, { status: 401 });
  }

  const { id: vendorProfileId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const result = await createVendorPulseReview({
    reviewerUserId: session.user.id,
    vendorProfileId,
    pulseRating: parsed.data.pulseRating,
    title: parsed.data.title,
    body: parsed.data.body,
    orderId: parsed.data.orderId,
    bookingId: parsed.data.bookingId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    reviewId: result.reviewId,
    pulseEarned: result.pulseEarned,
  });
}
