"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";

import { FormFeedback } from "@/components/ui/FormFeedback";
import {
  MAX_RESOURCE_BYTES_CLIENT,
  MAX_RESOURCE_BYTES_SERVER,
  buildResourceStoragePathname,
  displayNameFromResourceRef,
  resolveResourceExt,
  toBlobResourceRef,
} from "@/lib/resourceFileShared";

type Props = {
  fileRef: string;
  onFileRefChange: (fileRef: string) => void;
  format: string;
  onFormatChange: (format: string) => void;
  disabled?: boolean;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
  details?: Record<string, unknown>;
};

const CLIENT_UPLOAD_URL = "/api/vendor/listings/upload-resource/client";
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

function formatUploadError(
  res: Response,
  rawBody: string,
  parsed: ErrorPayload,
): { summary: string; extra?: string } {
  const parts: string[] = [];
  if (parsed.error) parts.push(parsed.error);
  if (parsed.hint) parts.push(parsed.hint);
  if (parsed.code) parts.push(`(code: ${parsed.code})`);

  let summary = parts.join(" ").trim();
  if (!summary) {
    summary = `Upload failed (HTTP ${res.status} ${res.statusText || ""})`.trim();
  }

  let extra: string | undefined;
  if (parsed.details && Object.keys(parsed.details).length > 0) {
    try {
      extra = JSON.stringify(parsed.details, null, 2);
    } catch {
      extra = String(parsed.details);
    }
  }

  if (!parsed.error && rawBody && rawBody.length > 0 && rawBody.length < 600) {
    const trimmed = rawBody.trim();
    if (!summary.includes(trimmed.slice(0, 80))) {
      extra = extra ? `${extra}\n\n${trimmed}` : trimmed;
    }
  }

  return { summary, extra };
}

async function uploadViaServer(file: File): Promise<{ fileRef: string; format: string }> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/vendor/listings/upload-resource", {
    method: "POST",
    body: fd,
  });

  const rawBody = await res.text();
  let parsed: ErrorPayload = {};
  if (rawBody) {
    try {
      parsed = JSON.parse(rawBody) as ErrorPayload;
    } catch {
      parsed = {};
    }
  }

  if (!res.ok) {
    const { summary } = formatUploadError(res, rawBody, parsed);
    throw new Error(summary);
  }

  const data = JSON.parse(rawBody) as { fileRef?: string; format?: string };
  if (!data.fileRef) {
    throw new Error("Upload succeeded but no file reference was returned.");
  }

  return { fileRef: data.fileRef, format: data.format ?? "" };
}

async function uploadViaClient(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ fileRef: string; format: string }> {
  const resolved = resolveResourceExt(file.type || "", file.name);
  if ("error" in resolved) {
    throw new Error(resolved.error);
  }

  const pathname = buildResourceStoragePathname(resolved.ext);
  const multipart = file.size > MULTIPART_THRESHOLD_BYTES;
  const uploadOptions = {
    handleUploadUrl: CLIENT_UPLOAD_URL,
    multipart,
    contentType: file.type.trim() || undefined,
    onUploadProgress: ({ percentage }: { percentage: number }) => onProgress(percentage),
  } as const;

  let uploaded;
  try {
    uploaded = await upload(pathname, file, { access: "private", ...uploadOptions });
  } catch {
    uploaded = await upload(pathname, file, { access: "public", ...uploadOptions });
  }

  return {
    fileRef: toBlobResourceRef(uploaded.pathname),
    format: resolved.format,
  };
}

export function VendorResourceFileField({
  fileRef,
  onFileRefChange,
  format,
  onFormatChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorExtra, setUploadErrorExtra] = useState<string | null>(null);
  const [lastFileInfo, setLastFileInfo] = useState<string | null>(null);
  const [showExternalUrl, setShowExternalUrl] = useState(
    () => !!fileRef && !fileRef.startsWith("blob:") && !fileRef.startsWith("/uploads/"),
  );

  const maxClientMb = MAX_RESOURCE_BYTES_CLIENT / (1024 * 1024);
  const maxServerMb = MAX_RESOURCE_BYTES_SERVER / (1024 * 1024);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploadErrorExtra(null);
    setUploadSuccess(null);
    setUploadProgress(null);
    setLastFileInfo(
      `${file.name || "file"} · ${(file.size / 1024).toFixed(1)} KB · type: ${file.type || "unknown"}`,
    );
    setUploading(true);

    try {
      if (file.size > MAX_RESOURCE_BYTES_CLIENT) {
        throw new Error(`File is too large. Maximum is ${maxClientMb} MB.`);
      }

      const resolved = resolveResourceExt(file.type || "", file.name);
      if ("error" in resolved) {
        throw new Error(resolved.error);
      }

      let result: { fileRef: string; format: string };

      if (file.size > MAX_RESOURCE_BYTES_SERVER) {
        try {
          result = await uploadViaClient(file, setUploadProgress);
        } catch (clientErr) {
          // Local dev without Blob: fall back to server upload up to local cap.
          try {
            result = await uploadViaServer(file);
          } catch {
            throw clientErr;
          }
        }
      } else {
        result = await uploadViaServer(file);
      }

      onFileRefChange(result.fileRef);
      if (result.format && !format.trim()) {
        onFormatChange(result.format);
      }
      setShowExternalUrl(false);
      setUploadErrorExtra(null);
      setUploadSuccess("File uploaded. Buyers access it securely after purchase.");
      window.setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
      setUploadErrorExtra(
        file.size > MAX_RESOURCE_BYTES_SERVER
          ? "Large files upload directly to secure storage. Ensure BLOB_READ_WRITE_TOKEN is set on Vercel."
          : "Check your connection and ensure you are signed in as an approved vendor.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  const hasUploadedFile = !!fileRef.trim();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-fix-text">Delivery file</label>
      <FormFeedback success={uploadSuccess} error={null} />
      <p className="text-xs text-fix-text-muted">
        PDF, ZIP, EPUB, DOCX, XLSX, PPTX, TXT, or CSV. Files up to {maxServerMb} MB use a quick
        upload; larger files (to {maxClientMb} MB) upload directly to secure storage from your
        browser.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.zip,.epub,.docx,.xlsx,.pptx,.txt,.csv,application/pdf,application/zip,application/epub+zip"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => void onFileChange(e)}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-fix-border/25 bg-fix-bg-muted px-3 py-2 text-sm font-medium text-fix-heading hover:bg-fix-border/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileUp className="h-4 w-4" aria-hidden />
          )}
          {uploading ? "Uploading…" : hasUploadedFile ? "Replace file" : "Upload file"}
        </button>

        {hasUploadedFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-fix-border/20 bg-fix-bg-muted/60 px-3 py-2 text-sm text-fix-heading">
            <span className="max-w-[220px] truncate" title={displayNameFromResourceRef(fileRef)}>
              {displayNameFromResourceRef(fileRef)}
            </span>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onFileRefChange("")}
              className="rounded p-0.5 text-fix-text-muted hover:bg-fix-border/15 hover:text-fix-heading"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {uploading && uploadProgress != null ? (
        <div className="space-y-1" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-fix-border/20">
            <div
              className="h-full rounded-full bg-forest transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
            />
          </div>
          <p className="text-xs text-fix-text-muted">
            Uploading to secure storage… {Math.round(uploadProgress)}%
          </p>
        </div>
      ) : null}

      {lastFileInfo ? (
        <p className="text-xs text-fix-text-muted" aria-live="polite">
          Last attempt: {lastFileInfo}
        </p>
      ) : null}

      {uploadError ? (
        <div
          className="rounded-lg border border-bark/25 bg-bark/5 px-3 py-2 text-sm text-bark"
          role="alert"
        >
          <p className="font-medium">{uploadError}</p>
          {uploadErrorExtra ? (
            <p className="mt-1 text-xs text-fix-text-muted">{uploadErrorExtra}</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
          onClick={() => setShowExternalUrl((v) => !v)}
        >
          {showExternalUrl ? "Hide external URL option" : "Use external URL instead"}
        </button>
      </div>

      {showExternalUrl ? (
        <div>
          <label htmlFor="resource-external-url" className="block text-sm font-medium text-fix-text">
            External file URL
          </label>
          <p className="mt-0.5 text-xs text-fix-text-muted">
            Prefer upload for secure delivery. External links are less protected.
          </p>
          <input
            id="resource-external-url"
            type="url"
            value={fileRef.startsWith("blob:") || fileRef.startsWith("/uploads/") ? "" : fileRef}
            onChange={(e) => onFileRefChange(e.target.value)}
            placeholder="https://… hosted file"
            disabled={disabled}
            className="mt-1.5 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          />
        </div>
      ) : null}
    </div>
  );
}
