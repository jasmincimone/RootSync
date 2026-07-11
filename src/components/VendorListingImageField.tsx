"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { FormFeedback } from "@/components/ui/FormFeedback";
import { ListingImage } from "@/components/ListingImage";

type Props = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
  details?: Record<string, unknown>;
};

function formatUploadError(
  res: Response,
  rawBody: string,
  parsed: ErrorPayload
): { summary: string; extra?: string } {
  const parts: string[] = [];

  if (parsed.error) {
    parts.push(parsed.error);
  }

  if (parsed.hint) {
    parts.push(parsed.hint);
  }

  if (parsed.code) {
    parts.push(`(code: ${parsed.code})`);
  }

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

export function VendorListingImageField({
  imageUrl,
  onImageUrlChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorExtra, setUploadErrorExtra] = useState<string | null>(null);
  const [lastFileInfo, setLastFileInfo] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploadErrorExtra(null);
    setUploadSuccess(null);
    setLastFileInfo(
      `${file.name || "file"} · ${(file.size / 1024).toFixed(1)} KB · type: ${file.type || "unknown"}`
    );
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/vendor/listings/upload", {
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
        const { summary, extra } = formatUploadError(res, rawBody, parsed);
        setUploadError(summary);
        setUploadErrorExtra(extra ?? null);
        return;
      }

      let data: { url?: string };
      try {
        data = JSON.parse(rawBody) as { url?: string };
      } catch {
        setUploadError("Server returned an invalid response (not JSON).");
        setUploadErrorExtra(rawBody.slice(0, 400) || null);
        return;
      }

      if (!data.url) {
        setUploadError("Upload succeeded but no image URL was returned.");
        setUploadErrorExtra(rawBody.slice(0, 400) || null);
        return;
      }
      onImageUrlChange(data.url);
      setUploadErrorExtra(null);
      setUploadSuccess("Uploaded. Image address filled in below.");
      window.setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(`Network or browser error: ${msg}`);
      setUploadErrorExtra(
        "Check your connection, disable VPN/proxy if applicable, and ensure you are on the same site (no mixed http/https)."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fix-text">Listing image</label>
      <FormFeedback success={uploadSuccess} error={null} />
      <p className="text-xs text-fix-text-muted">
        Upload a JPEG, PNG, WebP, or GIF (max 5 MB), or set an image address below (full{" "}
        <code className="rounded bg-fix-bg-muted px-1">https://</code> link or a site path like{" "}
        <code className="rounded bg-fix-bg-muted px-1">/uploads/…</code> after upload).
      </p>

      <div className="flex flex-wrap items-start gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
            <ImagePlus className="h-4 w-4" aria-hidden />
          )}
          {uploading ? "Uploading…" : "Upload image"}
        </button>

        {imageUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-fix-border/20 bg-fix-surface">
            <ListingImage src={imageUrl} alt="" />
          </div>
        ) : null}
      </div>

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
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-fix-text-muted">
              {uploadErrorExtra}
            </pre>
          ) : null}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="listing-image-address"
          className="block text-sm font-medium text-fix-text"
        >
          Image address
        </label>
        <p className="mt-0.5 text-xs text-fix-text-muted">
          Use <span className="font-medium">text</span> here—not a strict URL field—so paths such as{" "}
          <code className="rounded bg-fix-bg-muted px-1">/uploads/vendor-listings/…</code> stay valid.
        </p>
        <input
          id="listing-image-address"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder="https://example.com/photo.jpg or /uploads/vendor-listings/…"
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
        />
      </div>
    </div>
  );
}
