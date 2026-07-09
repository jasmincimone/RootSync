import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isBlobLike, saveUploadedMedia } from "@/lib/mediaUpload";
import { saveUploadedPulseFile } from "@/lib/pulsePostFileUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Could not read upload form data." }, { status: 400 });
    }

    const entry = formData.get("file");
    if (entry == null || typeof entry === "string" || !isBlobLike(entry)) {
      return NextResponse.json({ error: "No valid file was sent." }, { status: 400 });
    }

    const fileName = typeof File !== "undefined" && entry instanceof File ? entry.name : "upload.bin";
    const storagePrefix = `pulse-posts/${session.user.id}`;

    const mediaResult = await saveUploadedMedia(entry, fileName, storagePrefix);
    if (!("error" in mediaResult)) {
      return NextResponse.json({ url: mediaResult.url, type: mediaResult.kind });
    }

    const fileResult = await saveUploadedPulseFile(entry, fileName, storagePrefix);
    if (!("error" in fileResult)) {
      return NextResponse.json({
        url: fileResult.url,
        type: "file" as const,
        fileName: fileResult.fileName,
        format: fileResult.format,
      });
    }

    return NextResponse.json(
      {
        error: mediaResult.error,
        hint: mediaResult.hint ?? fileResult.hint,
        code: mediaResult.code ?? fileResult.code,
      },
      { status: mediaResult.code === "BLOB_NOT_CONFIGURED" || fileResult.code === "BLOB_NOT_CONFIGURED" ? 503 : 400 },
    );
  } catch (e) {
    console.error("[pulse post upload] error:", e);
    return NextResponse.json({ error: "Unexpected error while handling upload." }, { status: 500 });
  }
}
