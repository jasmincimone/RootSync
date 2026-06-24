import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export type MediaKind = "image" | "video";

export function isBlobLike(v: unknown): v is Blob {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Blob).arrayBuffer === "function" &&
    typeof (v as Blob).size === "number"
  );
}

function extFromFilename(name: string, kind: MediaKind): string | null {
  const pattern =
    kind === "image"
      ? /\.(jpe?g|png|webp|gif)$/i
      : /\.(mp4|webm|mov)$/i;
  const m = name.toLowerCase().match(pattern);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  if (kind === "image") {
    if (ext === "jpeg" || ext === "jpg") return ".jpg";
    if (ext === "png") return ".png";
    if (ext === "webp") return ".webp";
    if (ext === "gif") return ".gif";
    return null;
  }
  if (ext === "mp4") return ".mp4";
  if (ext === "webm") return ".webm";
  if (ext === "mov") return ".mov";
  return null;
}

function resolveMedia(
  mimeType: string,
  fileName: string,
): { kind: MediaKind; ext: string } | { error: string } {
  const normalized = mimeType.trim().toLowerCase();

  if (normalized && IMAGE_MIME_TO_EXT[normalized]) {
    return { kind: "image", ext: IMAGE_MIME_TO_EXT[normalized] };
  }
  if (normalized && VIDEO_MIME_TO_EXT[normalized]) {
    return { kind: "video", ext: VIDEO_MIME_TO_EXT[normalized] };
  }

  const imageExt = extFromFilename(fileName, "image");
  if (imageExt) return { kind: "image", ext: imageExt };

  const videoExt = extFromFilename(fileName, "video");
  if (videoExt) return { kind: "video", ext: videoExt };

  if (!normalized) {
    return {
      error:
        "Could not detect file type. Use .jpg/.png/.webp/.gif for images or .mp4/.webm/.mov for video.",
    };
  }
  return {
    error: `Unsupported type "${mimeType}". Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.`,
  };
}

function contentTypeForExt(ext: string, kind: MediaKind): string {
  if (kind === "image") {
    if (ext === ".jpg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    return "image/gif";
  }
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return "video/mp4";
}

export type SavedMedia = {
  url: string;
  kind: MediaKind;
};

export async function saveUploadedMedia(
  blob: Blob,
  fileName: string,
  storagePrefix: string,
): Promise<SavedMedia | { error: string; hint?: string; code?: string; details?: Record<string, unknown> }> {
  const mimeType = blob.type || "";

  if (blob.size === 0) {
    return {
      error: "The selected file is empty (0 bytes).",
      hint: "Pick a different file.",
      code: "EMPTY_FILE",
    };
  }

  const resolved = resolveMedia(mimeType, fileName);
  if ("error" in resolved) {
    return {
      error: resolved.error,
      hint: "Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.",
      code: "BAD_MIME",
      details: { reportedType: mimeType || null, name: fileName },
    };
  }

  const maxBytes = resolved.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (blob.size > maxBytes) {
    const mb = (blob.size / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      error: `File is too large (${mb} MB). Maximum is ${maxMb} MB for ${resolved.kind}s.`,
      hint:
        resolved.kind === "video"
          ? "Compress the video, use a shorter clip, or paste a hosted video URL instead."
          : "Resize or compress the image, or paste an image URL instead.",
      code: "FILE_TOO_LARGE",
      details: { sizeBytes: blob.size, maxBytes, kind: resolved.kind },
    };
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const filename = `${crypto.randomUUID()}${resolved.ext}`;
  const contentType = mimeType.trim() || contentTypeForExt(resolved.ext, resolved.kind);

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    const uploaded = await put(`${storagePrefix}/${filename}`, buffer, {
      access: "public",
      contentType,
      token: blobToken,
    });
    return { url: uploaded.url, kind: resolved.kind };
  }

  if (process.env.VERCEL) {
    return {
      error: "Media upload is not configured on this server.",
      hint:
        "On Vercel, connect Blob storage (BLOB_READ_WRITE_TOKEN) or paste a full https:// URL for hosted media.",
      code: "BLOB_NOT_CONFIGURED",
    };
  }

  const publicSubdir = storagePrefix.replace(/^\/+/, "");
  const dir = path.join(process.cwd(), "public", "uploads", publicSubdir);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buffer);
  return { url: `/uploads/${publicSubdir}/${filename}`, kind: resolved.kind };
}
