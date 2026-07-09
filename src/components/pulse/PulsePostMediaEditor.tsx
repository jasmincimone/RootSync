"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import {
  MAX_PULSE_POST_MEDIA,
  newPulsePostMediaItem,
  type PulsePostMediaItem,
} from "@/config/pulsePostMedia";
import { PulsePostMediaPreviewRow } from "@/components/pulse/PulsePostMediaGallery";
import { FormFeedback } from "@/components/ui/FormFeedback";

type Props = {
  items: PulsePostMediaItem[];
  onChange: (items: PulsePostMediaItem[]) => void;
  disabled?: boolean;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
};

const UPLOAD_ENDPOINT = "/api/community/posts/upload";

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.zip,.epub,.docx,.xlsx,.pptx,.txt,.csv,.mp4,.webm,.mov";

export function PulsePostMediaEditor({ items, onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const atLimit = items.length >= MAX_PULSE_POST_MEDIA;

  async function uploadFile(file: File) {
    if (atLimit) {
      setUploadError(`You can attach up to ${MAX_PULSE_POST_MEDIA} items per Pulse.`);
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
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
        return;
      }
      if (!parsed.url || !parsed.type) {
        setUploadError("Upload succeeded but the server response was invalid.");
        return;
      }
      onChange([
        ...items,
        newPulsePostMediaItem({
          type: parsed.type,
          url: parsed.url,
          fileName: parsed.fileName ?? file.name,
          label: file.name,
        }),
      ]);
      setUploadSuccess("Attachment added.");
      window.setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-fix-heading">Photos, videos, or files</p>
        <p className="mt-1 text-xs text-fix-text-muted">
          Images up to 5 MB, videos up to 50 MB, documents up to 10 MB. Up to {MAX_PULSE_POST_MEDIA}{" "}
          attachments per Pulse.
        </p>
      </div>

      <FormFeedback success={uploadSuccess} error={uploadError} />

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
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
          {uploading ? "Uploading…" : atLimit ? "Attachment limit reached" : "Add photo, video, or file"}
        </button>
      </div>

      {items.length > 0 ? (
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
      ) : null}
    </div>
  );
}
