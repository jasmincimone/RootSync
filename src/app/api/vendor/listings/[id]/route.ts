import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { normalizePaymentUrlPatch, normalizeProductUrlPatch } from "@/lib/paymentUrl";
import { prisma } from "@/lib/prisma";
import { canManageVendorListings } from "@/lib/vendorListingAccess";
import { LISTING_STATUS } from "@/lib/roles";

async function getVendorListing(userId: string, listingId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendorProfile: true },
  });
  if (!user?.vendorProfile || !canManageVendorListings(user.role, user.vendorProfile.status)) {
    return null;
  }
  const listing = await prisma.marketplaceListing.findFirst({
    where: { id: listingId, vendorProfileId: user.vendorProfile.id },
  });
  return listing;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const listing = await getVendorListing(session.user.id, id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ listing });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVendorListing(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { title, description, priceCents, category, imageUrl, status } = body;

  const data: Prisma.MarketplaceListingUpdateInput = {};
  if (typeof title === "string") data.title = title.trim();
  if (typeof description === "string") data.description = description.trim();
  if (typeof priceCents === "number" && priceCents >= 0 && !Number.isNaN(priceCents)) {
    data.priceCents = Math.round(priceCents);
  }
  if ("category" in body) {
    if (category === null || category === "") data.category = null;
    else if (typeof category === "string") data.category = category.trim() || null;
  }
  if ("imageUrl" in body) {
    if (imageUrl === null || imageUrl === "") data.imageUrl = null;
    else if (typeof imageUrl === "string") data.imageUrl = imageUrl.trim() || null;
  }
  if (
    status === LISTING_STATUS.DRAFT ||
    status === LISTING_STATUS.PUBLISHED ||
    status === LISTING_STATUS.ARCHIVED
  ) {
    data.status = status;
  }

  try {
    const paymentPatch = normalizePaymentUrlPatch(body);
    if (paymentPatch !== undefined) {
      data.paymentUrl = paymentPatch;
    }
    const productPatch = normalizeProductUrlPatch(body);
    if (productPatch !== undefined) {
      data.productUrl = productPatch;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid link";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const listing = await prisma.marketplaceListing.update({
    where: { id: existing.id },
    data,
  });
  return NextResponse.json({ listing });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVendorListing(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.marketplaceListing.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
