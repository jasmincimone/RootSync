"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { ListingImage } from "@/components/ListingImage";

type Props = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
  inputId: string;
};

export function OptionChoiceImageField({
  imageUrl,
  onImageUrlChange,
  disabled = false,
  inputId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/vendor/listings/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Upload failed.");
      }
      if (!data.url) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }
      onImageUrlChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {imageUrl ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-fix-border/20 bg-fix-surface">
            <ListingImage src={imageUrl} alt="" />
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onImageUrlChange("")}
              className="absolute -right-1 -top-1 rounded-full border border-fix-border/25 bg-fix-surface p-0.5 text-fix-text-muted shadow-sm hover:text-bark disabled:opacity-40"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-fix-border/25 bg-fix-bg-muted px-2.5 py-1.5 text-xs font-medium text-fix-heading hover:bg-fix-border/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          )}
          {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
        </button>
      </div>
      <label htmlFor={inputId} className="sr-only">
        Image URL
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={imageUrl}
        disabled={disabled || uploading}
        onChange={(e) => onImageUrlChange(e.target.value)}
        placeholder="Or paste image URL /uploads/…"
        className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
      />
      {error ? (
        <p className="text-xs text-bark" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
