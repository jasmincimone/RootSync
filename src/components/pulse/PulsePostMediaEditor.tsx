"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import {
  MAX_PULSE_POST_MEDIA,
  newPulsePostMediaItem,
  type PulsePostMediaItem,
} from "@/config/pulsePostMedia";
import { ImageCropModal } from "@/components/ImageCropModal";
import { PulsePostMediaPreviewRow } from "@/components/pulse/PulsePostMediaGallery";
import { FormFeedback } from "@/components/ui/FormFeedback";

type Props = {
  items: PulsePostMediaItem[];
  onChange: (items: PulsePostMediaItem[]) => void;
  disabled?: boolean;
  heading?: string;
  description?: string;
  maxItems?: number;
  itemCount?: number;
  hideItems?: boolean;
  /** When true, images open the crop modal before upload (funnel / campaign polish). */
  enableImageCrop?: boolean;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
};

const UPLOAD_ENDPOINT = "/api/community/posts/upload";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.txt,.csv,.mp4,.webm,.mov";

function isImageFile(file: File) {
  return file.type.startsWith("image/") && file.type !== "image/gif";
}

export function PulsePostMediaEditor({
  items,
  onChange,
  disabled = false,
  heading = "Photos, videos, or files",
  description,
  maxItems = MAX_PULSE_POST_MEDIA,
  itemCount,
  hideItems = false,
  enableImageCrop = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const used = itemCount ?? items.length;
  const atLimit = used >= maxItems;

  async function uploadFile(file: File | Blob, fileName: string): Promise<PulsePostMediaItem | null> {
    const fd = new FormData();
    fd.set("file", file, fileName);
    const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: fd });
    const rawBody = await res.text();
    let parsed: ErrorPayload & {
      url?: string;
      type?: "image" | "video" | "file";
      fileName?: string;
    } = {};
    if (rawBody) {
      try {
        parsed = JSON.parse(rawBody) as typeof parsed;
      } catch {
        parsed = {};
      }
    }
    if (!res.ok) {
      const parts = [parsed.error, parsed.hint, parsed.code ? `(code: ${parsed.code})` : ""]
        .filter(Boolean)
        .join(" ");
      setUploadError(parts || `Upload failed (HTTP ${res.status})`);
      return null;
    }
    if (!parsed.url || !parsed.type) {
      setUploadError("Upload succeeded but the server response was invalid.");
      return null;
    }
    return newPulsePostMediaItem({
      type: parsed.type,
      url: parsed.url,
      fileName: parsed.fileName ?? fileName,
      label: fileName,
    });
  }

  async function appendUploaded(created: PulsePostMediaItem) {
    const next = [...items, created];
    onChange(next);
    setUploadSuccess("Attachment added.");
    window.setTimeout(() => setUploadSuccess(null), 4000);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);

    if (enableImageCrop && files.length === 1 && isImageFile(files[0])) {
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(files[0]);
      return;
    }

    setUploading(true);
    let next = items;
    let added = 0;
    try {
      for (const file of files) {
        if (used - items.length + next.length >= maxItems) {
          setUploadError(`You can attach up to ${maxItems} items.`);
          break;
        }
        if (enableImageCrop && isImageFile(file) && files.length > 1) {
          // Multi-select: skip crop for batch; still upload.
        }
        const created = await uploadFile(file, file.name);
        if (!created) break;
        next = [...next, created];
        added += 1;
        onChange(next);
      }
      if (added > 0) {
        setUploadSuccess(added === 1 ? "Attachment added." : `${added} attachments added.`);
        window.setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-fix-heading">{heading}</p>
        <p className="mt-1 text-xs text-fix-text-muted">
          {description ??
            `Images up to 5 MB, videos up to 50 MB, documents up to 10 MB. Up to ${MAX_PULSE_POST_MEDIA} attachments per Pulse.`}
        </p>
      </div>

      <FormFeedback success={uploadSuccess} error={uploadError} />

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={!enableImageCrop}
          className="sr-only"
          disabled={disabled || uploading || atLimit}
          onChange={onFileChange}
        />
        <button
          type="button"
          disabled={disabled || uploading || atLimit}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-fix-border/25 bg-fix-bg-muted px-3 py-2 text-sm font-medium text-fix-heading hover:bg-fix-border/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden />
          )}
          {uploading
            ? "Uploading…"
            : atLimit
              ? "Attachment limit reached"
              : enableImageCrop
                ? "Add photo (crop), video, or file"
                : "Add photo, video, or file"}
        </button>
      </div>

      {hideItems || items.length === 0 ? null : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <PulsePostMediaPreviewRow
                item={item}
                onRemove={() => onChange(items.filter((row) => row.id !== item.id))}
              />
            </li>
          ))}
        </ul>
      )}

      {cropSrc ? (
        <ImageCropModal
          imageSrc={cropSrc}
          initialAspect={16 / 9}
          onCancel={() => setCropSrc(null)}
          onCrop={async (blob) => {
            setCropSrc(null);
            if (atLimit) {
              setUploadError(`You can attach up to ${maxItems} items.`);
              return;
            }
            setUploading(true);
            setUploadError(null);
            try {
              const created = await uploadFile(blob, "funnel-media.jpg");
              if (created) await appendUploaded(created);
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
