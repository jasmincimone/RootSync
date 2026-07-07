import { NextRequest, NextResponse } from "next/server";

import { isBlobLike, saveUploadedResourceFile } from "@/lib/resourceUpload";
import { authorizeVendorUpload } from "@/lib/vendorUploadAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeVendorUpload();
    if ("response" in auth) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: "Could not read upload form data.",
          hint: "Try a smaller file or another browser.",
          code: "FORM_DATA_PARSE",
          details: process.env.NODE_ENV === "development" ? { message: msg } : undefined,
        },
        { status: 400 },
      );
    }

    const entry = formData.get("file");
    if (entry == null) {
      return NextResponse.json(
        {
          error: "No file was sent.",
          hint: 'The form must include a field named "file".',
          code: "MISSING_FILE",
        },
        { status: 400 },
      );
    }

    if (typeof entry === "string" || !isBlobLike(entry)) {
      return NextResponse.json(
        {
          error: "Invalid file payload.",
          hint: "Choose a resource file from your device.",
          code: "INVALID_FILE_ENTRY",
        },
        { status: 400 },
      );
    }

    const fileName =
      typeof File !== "undefined" && entry instanceof File ? entry.name : "resource.bin";

    const saved = await saveUploadedResourceFile(entry, fileName);
    if ("error" in saved) {
      return NextResponse.json(
        {
          error: saved.error,
          hint: saved.hint,
          code: saved.code,
          details: saved.details,
        },
        { status: saved.code === "BLOB_NOT_CONFIGURED" ? 503 : 400 },
      );
    }

    return NextResponse.json({
      fileRef: saved.fileRef,
      format: saved.format,
      fileName: saved.fileName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[vendor resource upload] error:", e);
    return NextResponse.json(
      {
        error: "Unexpected error while handling upload.",
        hint: "Check the terminal running `next dev` for the full stack trace.",
        code: "UNHANDLED",
        details: process.env.NODE_ENV === "development" ? { message } : undefined,
      },
      { status: 500 },
    );
  }
}
