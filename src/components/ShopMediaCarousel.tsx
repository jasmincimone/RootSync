"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ShopMediaCarouselItem } from "@/config/shopMediaCarousel";

type Props = {
  items: ShopMediaCarouselItem[];
  className?: string;
};

export function ShopMediaCarousel({ items, className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (index >= count && count > 0) {
      setIndex(0);
    }
  }, [count, index]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const current = items[index];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-fix-border/15 bg-fix-bg-muted/40 shadow-soft ${className}`}
      aria-roledescription="carousel"
      aria-label="Shop highlights"
    >
      <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
        {current.type === "video" ? (
          <video
            key={current.id}
            src={current.url}
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
            aria-label={current.alt || current.caption || "Shop video"}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded shop media
          <img
            key={current.id}
            src={current.url}
            alt={current.alt || current.caption || ""}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {current.caption ? (
        <p className="border-t border-fix-border/10 bg-fix-surface/90 px-4 py-3 text-sm text-fix-text-muted">
          {current.caption}
        </p>
      ) : null}

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-fix-border/20 bg-fix-surface/90 text-fix-heading shadow-soft transition hover:bg-fix-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-fix-border/20 bg-fix-surface/90 text-fix-heading shadow-soft transition hover:bg-fix-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === index
                    ? "bg-fix-primary scale-110"
                    : "bg-fix-surface/80 ring-1 ring-fix-border/30 hover:bg-fix-surface"
                }`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
