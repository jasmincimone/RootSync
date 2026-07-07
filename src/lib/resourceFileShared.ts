export const RESOURCE_BLOB_PREFIX = "vendor-resources";
export const BLOB_RESOURCE_REF_PREFIX = "blob:";

/** Vercel serverless body limit — smaller files use server upload. */
export const MAX_RESOURCE_BYTES_SERVER = 4 * 1024 * 1024;
/** Local dev server upload cap when Blob is not configured. */
export const MAX_RESOURCE_BYTES_LOCAL = 25 * 1024 * 1024;
/** Client upload cap (browser → Vercel Blob). */
export const MAX_RESOURCE_BYTES_CLIENT = 100 * 1024 * 1024;

export const RESOURCE_ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
] as const;

const RESOURCE_MIME_TO_EXT: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/epub+zip": ".epub",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

const EXT_TO_FORMAT: Record<string, string> = {
  ".pdf": "PDF",
  ".zip": "ZIP",
  ".epub": "EPUB",
  ".docx": "DOCX",
  ".xlsx": "XLSX",
  ".pptx": "PPTX",
  ".txt": "TXT",
  ".csv": "CSV",
};

function extFromFilename(name: string): string | null {
  const m = name.toLowerCase().match(/\.(pdf|zip|epub|docx|xlsx|pptx|txt|csv)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  return `.${ext}`;
}

export function resolveResourceExt(
  mimeType: string,
  fileName: string,
): { ext: string; format: string } | { error: string } {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized && RESOURCE_MIME_TO_EXT[normalized]) {
    const ext = RESOURCE_MIME_TO_EXT[normalized];
    return { ext, format: EXT_TO_FORMAT[ext] ?? ext.slice(1).toUpperCase() };
  }

  const fromName = extFromFilename(fileName);
  if (fromName) {
    return { ext: fromName, format: EXT_TO_FORMAT[fromName] ?? fromName.slice(1).toUpperCase() };
  }

  if (!normalized) {
    return {
      error:
        "Could not detect file type. Use PDF, ZIP, EPUB, DOCX, XLSX, PPTX, TXT, or CSV.",
    };
  }

  return {
    error: `Unsupported type "${mimeType}". Use PDF, ZIP, EPUB, DOCX, XLSX, PPTX, TXT, or CSV.`,
  };
}

export function buildResourceStoragePathname(ext: string): string {
  return `${RESOURCE_BLOB_PREFIX}/${crypto.randomUUID()}${ext}`;
}

/** Validates vendor resource pathnames from client uploads. */
export function isValidResourceBlobPathname(pathname: string): boolean {
  return /^vendor-resources\/[0-9a-f-]{36}\.(pdf|zip|epub|docx|xlsx|pptx|txt|csv)$/i.test(
    pathname,
  );
}

export function formatFromResourceRef(fileRef: string): string | null {
  if (isBlobResourceRef(fileRef)) {
    const pathname = blobPathnameFromRef(fileRef);
    const ext = extFromFilename(pathname);
    return ext ? (EXT_TO_FORMAT[ext] ?? ext.slice(1).toUpperCase()) : null;
  }
  const ext = extFromFilename(fileRef);
  return ext ? (EXT_TO_FORMAT[ext] ?? ext.slice(1).toUpperCase()) : null;
}

export function displayNameFromResourceRef(fileRef: string): string {
  if (isBlobResourceRef(fileRef)) {
    const pathname = blobPathnameFromRef(fileRef);
    const parts = pathname.split("/");
    return parts[parts.length - 1] || "Uploaded file";
  }
  try {
    const url = new URL(fileRef, "http://local");
    const parts = url.pathname.split("/");
    return parts[parts.length - 1] || "Resource file";
  } catch {
    const parts = fileRef.split("/");
    return parts[parts.length - 1] || "Resource file";
  }
}

export function isBlobResourceRef(fileRef: string): boolean {
  return fileRef.startsWith(BLOB_RESOURCE_REF_PREFIX);
}

export function blobPathnameFromRef(fileRef: string): string {
  return fileRef.slice(BLOB_RESOURCE_REF_PREFIX.length);
}

export function toBlobResourceRef(pathname: string): string {
  return `${BLOB_RESOURCE_REF_PREFIX}${pathname}`;
}

export function contentTypeForResourceExt(ext: string): string {
  const entry = Object.entries(RESOURCE_MIME_TO_EXT).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}
