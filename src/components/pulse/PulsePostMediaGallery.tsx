"use client";

import { FileText } from "lucide-react";

import { ShopMediaCarousel } from "@/components/ShopMediaCarousel";
import type { PulsePostMediaItem } from "@/config/pulsePostMedia";
import type { ShopMediaCarouselItem } from "@/config/shopMediaCarousel";
import { cn } from "@/lib/cn";

type Props = {
  media: PulsePostMediaItem[];
  className?: string;
};

function fileLabel(item: PulsePostMediaItem): string {
  return item.label || item.fileName || "Download file";
}

export function PulsePostMediaGallery({ media, className }: Props) {
  if (media.length === 0) return null;

  const visualItems: ShopMediaCarouselItem[] = media
    .filter((item) => item.type === "image" || item.type === "video")
    .map((item) => ({
      id: item.id,
      type: item.type as "image" | "video",
      url: item.url,
      alt: item.label,
      caption: item.label,
    }));

  const fileItems = media.filter((item) => item.type === "file");

  return (
    <div className={cn("mt-3 space-y-3", className)}>
      {visualItems.length > 1 ? (
        <ShopMediaCarousel items={visualItems} className="max-w-full" />
      ) : visualItems.length === 1 ? (
        <div className="overflow-hidden rounded-xl border border-fix-border/15 bg-fix-bg-muted/40">
          {visualItems[0].type === "video" ? (
            <video
              src={visualItems[0].url}
              className="max-h-[min(420px,70vh)] w-full bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              aria-label={visualItems[0].alt || "Pulse video"}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded pulse media
            <img
              src={visualItems[0].url}
              alt={visualItems[0].alt || "Pulse image"}
              className="max-h-[min(420px,70vh)] w-full object-cover"
            />
          )}
        </div>
      ) : null}

      {fileItems.length > 0 ? (
        <ul className="space-y-2">
          {fileItems.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 px-3 py-2.5 text-sm text-fix-link transition-colors hover:bg-fix-bg-muted"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fix-surface text-fix-heading">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fix-heading">{fileLabel(item)}</span>
                  <span className="text-xs text-fix-text-muted">Tap to open or download</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Compact preview row for editors */
export function PulsePostMediaPreviewRow({
  item,
  onRemove,
}: {
  item: PulsePostMediaItem;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-2">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-fix-border/20 bg-fix-surface">
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        ) : item.type === "video" ? (
          <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-fix-bg-muted text-fix-text-muted">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-xs text-fix-text-muted">
        <p className="truncate font-medium text-fix-heading">
          {item.label || item.fileName || item.type}
        </p>
        <p className="truncate capitalize">{item.type}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-bark hover:bg-fix-surface"
      >
        Remove
      </button>
    </div>
  );
}
