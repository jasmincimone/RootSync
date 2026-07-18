import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse } from "@/lib/rateLimit";
import { DIRECTORY_CLAIM_STATUS } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to request this listing." }, { status: 401 });
  }

  const limited = rateLimitResponse(request, "directoryClaim", {
    userId: session.user.id,
    scope: "directory-claim-request",
    message: "Too many claim requests. Try again shortly.",
  });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const directoryListingId =
    typeof body?.directoryListingId === "string" ? body.directoryListingId.trim() : "";
  if (!directoryListingId) {
    return NextResponse.json({ error: "Directory listing is required." }, { status: 400 });
  }

  const claimed = await prisma.directoryListing.updateMany({
    where: {
      id: directoryListingId,
      status: "ACTIVE",
      OR: [
        { claimStatus: DIRECTORY_CLAIM_STATUS.UNCLAIMED },
        { claimStatus: DIRECTORY_CLAIM_STATUS.REJECTED },
      ],
    },
    data: {
      claimStatus: DIRECTORY_CLAIM_STATUS.PENDING,
      claimRequestedByUserId: session.user.id,
      claimRequestedAt: new Date(),
    },
  });

  if (claimed.count > 0) {
    return NextResponse.json({ ok: true, status: DIRECTORY_CLAIM_STATUS.PENDING });
  }

  const listing = await prisma.directoryListing.findUnique({
    where: { id: directoryListingId },
    select: { status: true, claimStatus: true, claimRequestedByUserId: true },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return NextResponse.json({ error: "Directory listing not found." }, { status: 404 });
  }
  if (
    listing.claimStatus === DIRECTORY_CLAIM_STATUS.PENDING &&
    listing.claimRequestedByUserId === session.user.id
  ) {
    return NextResponse.json({ ok: true, status: DIRECTORY_CLAIM_STATUS.PENDING });
  }
  if (listing.claimStatus === DIRECTORY_CLAIM_STATUS.PENDING) {
    return NextResponse.json(
      { error: "A claim for this listing is already under review." },
      { status: 409 },
    );
  }
  if (
    listing.claimStatus === DIRECTORY_CLAIM_STATUS.REJECTED &&
    listing.claimRequestedByUserId === session.user.id
  ) {
    // Race: another request may have just claimed; treat as re-open for this user.
    await prisma.directoryListing.update({
      where: { id: directoryListingId },
      data: {
        claimStatus: DIRECTORY_CLAIM_STATUS.PENDING,
        claimRequestedByUserId: session.user.id,
        claimRequestedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, status: DIRECTORY_CLAIM_STATUS.PENDING });
  }

  return NextResponse.json({ error: "This listing has already been claimed." }, { status: 409 });
}
