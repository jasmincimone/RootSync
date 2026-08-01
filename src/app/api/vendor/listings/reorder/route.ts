import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse } from "@/lib/rateLimit";
import { requireApprovedVendorGate } from "@/lib/vendorListingAccess";

/**
 * Reorder vendor listings.
 * Body: { listingIds: string[] } — full ordered list of this vendor’s listing ids.
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimitResponse(request, "upload", {
    userId: session.user.id,
    scope: "vendor-listing-write",
    message: "Too many listing changes. Try again shortly.",
  });
  if (limited) return limited;

  const gate = await requireApprovedVendorGate(session.user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { listingIds?: unknown };
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds must be a non-empty array." }, { status: 400 });
  }

  const uniqueIds = [...new Set(listingIds)];
  if (uniqueIds.length !== listingIds.length) {
    return NextResponse.json({ error: "listingIds must not contain duplicates." }, { status: 400 });
  }

  const owned = await prisma.listing.findMany({
    where: {
      vendorProfileId: gate.vendorProfileId,
      id: { in: uniqueIds },
    },
    select: { id: true },
  });
  if (owned.length !== uniqueIds.length) {
    return NextResponse.json(
      { error: "One or more listings were not found on your account." },
      { status: 400 },
    );
  }

  const totalOwned = await prisma.listing.count({
    where: { vendorProfileId: gate.vendorProfileId },
  });
  if (uniqueIds.length !== totalOwned) {
    return NextResponse.json(
      { error: "Send every listing id in the new order." },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    uniqueIds.map((id, index) =>
      prisma.listing.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
