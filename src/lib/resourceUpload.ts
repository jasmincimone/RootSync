import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

import { isBlobLike } from "@/lib/mediaUpload";
import {
  MAX_RESOURCE_BYTES_CLIENT,
  MAX_RESOURCE_BYTES_LOCAL,
  MAX_RESOURCE_BYTES_SERVER,
  RESOURCE_BLOB_PREFIX,
  contentTypeForResourceExt,
  resolveResourceExt,
  toBlobResourceRef,
} from "@/lib/resourceFileShared";

export * from "@/lib/resourceFileShared";

export type SavedResourceFile = {
  fileRef: string;
  format: string;
  fileName: string;
};

export async function saveUploadedResourceFile(
  blob: Blob,
  fileName: string,
): Promise<
  | SavedResourceFile
  | { error: string; hint?: string; code?: string; details?: Record<string, unknown> }
> {
  if (blob.size === 0) {
    return {
      error: "The selected file is empty (0 bytes).",
      hint: "Pick a different file.",
      code: "EMPTY_FILE",
    };
  }

  const resolved = resolveResourceExt(blob.type || "", fileName);
  if ("error" in resolved) {
    return {
      error: resolved.error,
      hint: "Use PDF, ZIP, EPUB, DOCX, XLSX, PPTX, TXT, or CSV.",
      code: "BAD_MIME",
      details: { reportedType: blob.type || null, name: fileName },
    };
  }

  const maxBytes = process.env.VERCEL ? MAX_RESOURCE_BYTES_SERVER : MAX_RESOURCE_BYTES_LOCAL;
  if (blob.size > maxBytes) {
    const mb = (blob.size / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      error: `File is too large (${mb} MB). Maximum is ${maxMb} MB for server upload.`,
      hint: `Use a file up to ${MAX_RESOURCE_BYTES_CLIENT / (1024 * 1024)} MB — larger files upload directly to Blob from your browser.`,
      code: "FILE_TOO_LARGE",
      details: { sizeBytes: blob.size, maxBytes },
    };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const storedName = `${crypto.randomUUID()}${resolved.ext}`;
  const pathname = `${RESOURCE_BLOB_PREFIX}/${storedName}`;
  const contentType = blob.type.trim() || contentTypeForResourceExt(resolved.ext);

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const uploaded = await put(pathname, buffer, {
        access: "private",
        contentType,
        token: blobToken,
      });
      return {
        fileRef: toBlobResourceRef(uploaded.pathname),
        format: resolved.format,
        fileName: storedName,
      };
    } catch {
      const uploaded = await put(pathname, buffer, {
        access: "public",
        contentType,
        token: blobToken,
      });
      return {
        fileRef: toBlobResourceRef(uploaded.pathname),
        format: resolved.format,
        fileName: storedName,
      };
    }
  }

  if (process.env.VERCEL) {
    return {
      error: "Resource upload is not configured on this server.",
      hint: "On Vercel, connect Blob storage (BLOB_READ_WRITE_TOKEN), then redeploy.",
      code: "BLOB_NOT_CONFIGURED",
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads", RESOURCE_BLOB_PREFIX);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, storedName);
  await writeFile(fullPath, buffer);
  return {
    fileRef: `/uploads/${RESOURCE_BLOB_PREFIX}/${storedName}`,
    format: resolved.format,
    fileName: storedName,
  };
}

export { isBlobLike };
