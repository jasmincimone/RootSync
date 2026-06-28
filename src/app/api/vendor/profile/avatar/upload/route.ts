import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isBlobLike, saveUploadedMedia } from "@/lib/mediaUpload";
import { prisma } from "@/lib/prisma";
import { canEditShopLandingAsVendor, getVendorProfileForUser } from "@/lib/shopPageAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getVendorProfileForUser(session.user.id);
    if (!profile || !canEditShopLandingAsVendor(session, profile.status)) {
      return NextResponse.json({ error: "Vendor approval required" }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: "Could not read upload form data.",
          code: "FORM_DATA_PARSE",
          details: process.env.NODE_ENV === "development" ? { message: msg } : undefined,
        },
        { status: 400 },
      );
    }

    const entry = formData.get("file");
    if (entry == null || typeof entry === "string" || !isBlobLike(entry)) {
      return NextResponse.json({ error: "No valid file was sent.", code: "MISSING_FILE" }, { status: 400 });
    }

    const fileName = typeof File !== "undefined" && entry instanceof File ? entry.name : "upload.bin";
    const result = await saveUploadedMedia(entry, fileName, `vendor-profiles/${profile.id}`);

    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          hint: result.hint,
          code: result.code,
          details: result.details,
        },
        { status: result.code === "BLOB_NOT_CONFIGURED" ? 503 : 400 },
      );
    }

    if (result.kind !== "image") {
      return NextResponse.json({ error: "Profile photos must be images." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.vendorProfile.update({
        where: { id: profile.id },
        data: { profileImageUrl: result.url },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { imageUrl: result.url },
      }),
    ]);

    return NextResponse.json({ url: result.url });
  } catch (e) {
    console.error("[vendor profile avatar upload] error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Unexpected error while handling upload.",
        code: "UNHANDLED",
        details: process.env.NODE_ENV === "development" ? { message } : undefined,
      },
      { status: 500 },
    );
  }
}
