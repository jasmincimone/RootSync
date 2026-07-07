import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  MAX_RESOURCE_BYTES_CLIENT,
  RESOURCE_ALLOWED_CONTENT_TYPES,
  isValidResourceBlobPathname,
} from "@/lib/resourceFileShared";
import { authorizeVendorUpload } from "@/lib/vendorUploadAuth";

export const runtime = "nodejs";

/**
 * Client upload handler for vendor resource files (browser → Vercel Blob).
 * GET is not used; Vercel Blob POSTs token requests and completion webhooks here.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authorizeVendorUpload();
  if ("response" in auth) return auth.response;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "Blob storage is not configured.",
        hint: "Connect Vercel Blob to this project (BLOB_READ_WRITE_TOKEN), then redeploy.",
        code: "BLOB_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { actor } = auth;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidResourceBlobPathname(pathname)) {
          throw new Error("Invalid resource file path.");
        }

        return {
          allowedContentTypes: [...RESOURCE_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_RESOURCE_BYTES_CLIENT,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: actor.userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (process.env.NODE_ENV === "development") {
          console.info("[resource client upload] completed", blob.pathname, tokenPayload);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload authorization failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
