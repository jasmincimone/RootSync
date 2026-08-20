import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { saveUploadedMedia, isBlobLike } from "@/lib/mediaUpload";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const vendor = await prisma.vendorProfile.findFirst({
    where: { userId: session.user.id, status: VENDOR_STATUS.APPROVED },
    select: { id: true },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor profile required." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read form data." }, { status: 400 });
  }

  const entry = formData.get("file");
  if (!entry || typeof entry === "string" || !isBlobLike(entry)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  const fileName =
    typeof File !== "undefined" && entry instanceof File ? entry.name : "upload.jpg";

  const result = await saveUploadedMedia(entry, fileName, "growth-campaigns");
  if ("error" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}
