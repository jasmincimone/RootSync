import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

import { resolveResourceExt } from "@/lib/resourceFileShared";

const MAX_PULSE_FILE_BYTES = 10 * 1024 * 1024;

export type SavedPulseFile = {
  url: string;
  fileName: string;
  format: string;
};

export async function saveUploadedPulseFile(
  blob: Blob,
  fileName: string,
  storagePrefix: string,
): Promise<
  SavedPulseFile | { error: string; hint?: string; code?: string; details?: Record<string, unknown> }
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

  if (blob.size > MAX_PULSE_FILE_BYTES) {
    const mb = (blob.size / (1024 * 1024)).toFixed(2);
    const maxMb = (MAX_PULSE_FILE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      error: `File is too large (${mb} MB). Maximum is ${maxMb} MB.`,
      hint: "Compress the file or share a link in your post text instead.",
      code: "FILE_TOO_LARGE",
      details: { sizeBytes: blob.size, maxBytes: MAX_PULSE_FILE_BYTES },
    };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const storedName = `${crypto.randomUUID()}${resolved.ext}`;
  const contentType = blob.type.trim() || "application/octet-stream";

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const uploaded = await put(`${storagePrefix}/${storedName}`, buffer, {
      access: "public",
      contentType,
      token: blobToken,
    });
    return {
      url: uploaded.url,
      fileName: fileName.trim() || storedName,
      format: resolved.format,
    };
  }

  if (process.env.VERCEL) {
    return {
      error: "File upload is not configured on this server.",
      hint: "Connect Blob storage (BLOB_READ_WRITE_TOKEN) on Vercel.",
      code: "BLOB_NOT_CONFIGURED",
    };
  }

  const publicSubdir = storagePrefix.replace(/^\/+/, "");
  const dir = path.join(process.cwd(), "public", "uploads", publicSubdir);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, storedName);
  await writeFile(fullPath, buffer);
  return {
    url: `/uploads/${publicSubdir}/${storedName}`,
    fileName: fileName.trim() || storedName,
    format: resolved.format,
  };
}
