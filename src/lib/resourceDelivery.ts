import { readFile } from "fs/promises";
import path from "path";
import { get } from "@vercel/blob";

import {
  blobPathnameFromRef,
  isBlobResourceRef,
} from "@/lib/resourceFileShared";

export type ResourceStreamResult = {
  body: ReadableStream | ArrayBuffer;
  contentType: string;
  filename: string;
};

function filenameFromPathname(pathname: string): string {
  const parts = pathname.split("/");
  return parts[parts.length - 1] || "resource";
}

async function streamBlobPathname(pathname: string): Promise<ResourceStreamResult | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  const privateResult = await get(pathname, { access: "private", token }).catch(() => null);
  if (privateResult?.statusCode === 200 && privateResult.stream) {
    return {
      body: privateResult.stream,
      contentType: privateResult.blob.contentType || "application/octet-stream",
      filename: filenameFromPathname(pathname),
    };
  }

  const publicResult = await get(pathname, { access: "public", token }).catch(() => null);
  if (publicResult?.statusCode === 200 && publicResult.stream) {
    return {
      body: publicResult.stream,
      contentType: publicResult.blob.contentType || "application/octet-stream",
      filename: filenameFromPathname(pathname),
    };
  }

  return null;
}

export async function resolveResourceDelivery(
  fileRef: string,
): Promise<ResourceStreamResult | { error: string }> {
  const trimmed = fileRef.trim();
  if (!trimmed) {
    return { error: "No file configured for this resource." };
  }

  if (isBlobResourceRef(trimmed)) {
    const pathname = blobPathnameFromRef(trimmed);
    const streamed = await streamBlobPathname(pathname);
    if (streamed) return streamed;
    return { error: "Stored file could not be retrieved." };
  }

  if (trimmed.startsWith("/uploads/")) {
    const fullPath = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""));
    try {
      const buffer = await readFile(fullPath);
      const filename = filenameFromPathname(trimmed);
      const ext = filename.split(".").pop()?.toLowerCase();
      const contentType =
        ext === "pdf"
          ? "application/pdf"
          : ext === "zip"
            ? "application/zip"
            : "application/octet-stream";
      return {
        body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        contentType,
        filename,
      };
    } catch {
      return { error: "Local file not found." };
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { error: "external" };
  }

  return { error: "Unsupported file reference." };
}
