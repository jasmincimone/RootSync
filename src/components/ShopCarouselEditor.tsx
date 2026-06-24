"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Film, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import {
  newCarouselItem,
  type ShopMediaCarouselItem,
} from "@/config/shopMediaCarousel";

type Props = {
  uploadEndpoint: string;
  items: ShopMediaCarouselItem[];
  onChange: (items: ShopMediaCarouselItem[]) => void;
  disabled?: boolean;
  description?: string;
};

type ErrorPayload = {
  error?: string;
  hint?: string;
  code?: string;
  details?: Record<string, unknown>;
};

function formatUploadError(res: Response, rawBody: string, parsed: ErrorPayload): string {
  const parts: string[] = [];
  if (parsed.error) parts.push(parsed.error);
  if (parsed.hint) parts.push(parsed.hint);
  if (parsed.code) parts.push(`(code: ${parsed.code})`);
  let summary = parts.join(" ").trim();
  if (!summary) summary = `Upload failed (HTTP ${res.status})`;
  if (!parsed.error && rawBody.length > 0 && rawBody.length < 400) {
    summary += ` — ${rawBody.trim()}`;
  }
  return summary;
}

export function ShopCarouselEditor({
  uploadEndpoint,
  items,
  onChange,
  disabled = false,
  description = "Images and videos shown on your shop landing page between Featured items and Coming soon. Upload directly (images up to 5 MB, videos up to 50 MB) or paste a hosted URL.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");

  function updateItem(id: string, patch: Partial<ShopMediaCarouselItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function moveItem(id: string, direction: -1 | 1) {
    const idx = items.findIndex((item) => item.id === id);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const [removed] = copy.splice(idx, 1);
    copy.splice(next, 0, removed);
    onChange(copy);
  }

  async function uploadFile(file: File) {
    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(uploadEndpoint, {
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
        setUploadError(formatUploadError(res, rawBody, parsed));
        return;
      }
      const data = JSON.parse(rawBody) as { url?: string; type?: "image" | "video" };
      if (!data.url || (data.type !== "image" && data.type !== "video")) {
        setUploadError("Upload succeeded but the server response was invalid.");
        return;
      }
      onChange([...items, newCarouselItem({ type: data.type, url: data.url })]);
      setUploadSuccess(`Added ${data.type} to carousel.`);
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

  function addFromUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange([...items, newCarouselItem({ type: urlType, url })]);
    setUrlDraft("");
    setUploadSuccess("Added URL to carousel.");
    window.setTimeout(() => setUploadSuccess(null), 4000);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-fix-heading">Media carousel</div>
        <p className="mt-1 text-xs text-fix-text-muted">{description}</p>
      </div>

      <FormFeedback success={uploadSuccess} error={uploadError} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={onFileChange}
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
          {uploading ? "Uploading…" : "Upload image or video"}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium text-fix-text">Or paste media URL</label>
          <input
            type="text"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://… or /uploads/shop-media/…"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fix-text">Type</label>
          <select
            value={urlType}
            onChange={(e) => setUrlType(e.target.value === "video" ? "video" : "image")}
            disabled={disabled}
            className="mt-1 rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled || !urlDraft.trim()} onClick={addFromUrl}>
          Add URL
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-fix-text-muted">No carousel slides yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-3"
            >
              <div className="flex flex-wrap gap-3">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-fix-border/20 bg-fix-surface">
                  {item.type === "video" ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-fix-text-muted">
                      <Film className="h-5 w-5" aria-hidden />
                      <span className="text-[10px] font-medium uppercase tracking-wide">Video</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-fix-surface px-2 py-0.5 text-xs font-medium capitalize text-fix-heading ring-1 ring-fix-border/20">
                      {item.type}
                    </span>
                    <span className="truncate text-xs text-fix-text-muted">{item.url}</span>
                  </div>
                  <input
                    type="text"
                    value={item.alt ?? ""}
                    onChange={(e) => updateItem(item.id, { alt: e.target.value })}
                    placeholder="Alt text (images)"
                    disabled={disabled}
                    className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1.5 text-xs text-fix-text"
                  />
                  <input
                    type="text"
                    value={item.caption ?? ""}
                    onChange={(e) => updateItem(item.id, { caption: e.target.value })}
                    placeholder="Caption (optional)"
                    disabled={disabled}
                    className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1.5 text-xs text-fix-text"
                  />
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => moveItem(item.id, -1)}
                    className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === items.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                    className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg border border-bark/20 p-1.5 text-bark hover:bg-bark/5"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** @deprecated Use ShopCarouselEditor */
export const AdminShopCarouselEditor = ShopCarouselEditor;
