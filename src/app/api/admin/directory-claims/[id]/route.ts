import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DIRECTORY_CLAIM_STATUS, VENDOR_STATUS } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  const listing = await prisma.directoryListing.findUnique({
    where: { id },
    include: {
      claimRequestedBy: {
        select: {
          id: true,
          vendorProfile: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!listing || listing.claimStatus !== DIRECTORY_CLAIM_STATUS.PENDING) {
    return NextResponse.json({ error: "Pending claim not found." }, { status: 404 });
  }

  if (action === "reject") {
    await prisma.directoryListing.update({
      where: { id },
      data: {
        claimStatus: DIRECTORY_CLAIM_STATUS.UNCLAIMED,
        claimRequestedByUserId: null,
        claimRequestedAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    const vendorProfile = listing.claimRequestedBy?.vendorProfile;
    if (!vendorProfile || vendorProfile.status !== VENDOR_STATUS.APPROVED) {
      return NextResponse.json(
        { error: "Approve this member's Vendor application before approving the Directory claim." },
        { status: 409 },
      );
    }

    await prisma.directoryListing.update({
      where: { id },
      data: {
        claimStatus: DIRECTORY_CLAIM_STATUS.CLAIMED,
        claimedVendorProfileId: vendorProfile.id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
