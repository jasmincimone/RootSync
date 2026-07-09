"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_EXPLORE_ITEMS } from "@/config/platformExploreNav";
import { cn } from "@/lib/cn";

export function PlatformFeaturesExplorer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => PLATFORM_EXPLORE_ITEMS.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function toggleItem(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  return (
    <div className="mt-10">
      <div className="relative rounded-3xl bg-fix-surface/70 p-1.5 sm:p-2 md:p-3">
        <div className="grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 md:gap-4">
          {PLATFORM_EXPLORE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-label={`Open ${item.title}`}
              aria-pressed={selected?.id === item.id}
              className={cn(
                item.gridClass,
                "group overflow-hidden rounded-[18px] bg-[#f3f0ed] p-1 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 sm:rounded-[22px] sm:p-1.5 md:rounded-[26px] md:p-2",
                selected?.id === item.id && "ring-2 ring-fix-cta/60",
              )}
            >
              <Image
                src={item.menuCardSrc}
                alt=""
                width={600}
                height={200}
                sizes="(max-width: 640px) 42vw, (max-width: 768px) 45vw, 50vw"
                className="h-auto w-full rounded-[14px] object-cover sm:rounded-[18px] md:rounded-[22px]"
              />
            </button>
          ))}
        </div>

        {selected ? (
          <button
            type="button"
            aria-label="Close feature details"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 z-20 rounded-3xl bg-fix-surface/45 backdrop-blur-[2px]"
          >
            <span className="sr-only">Close</span>
          </button>
        ) : null}

        {selected ? (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6"
            onClick={() => setSelectedId(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelectedId(null);
            }}
            role="presentation"
          >
            <Card
              className="relative w-full max-w-2xl p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading"
                aria-label="Close"
              >
                ×
              </button>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <BrandPngIcon src={selected.iconSrc} size={88} withBrandPlate />
                <div className="min-w-0 flex-1 pr-6 sm:pr-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                    {selected.tagline}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-fix-heading">{selected.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                    {selected.description}
                  </p>
                  <div className="mt-5">
                    <ButtonLink href={selected.href} variant="cta" size="md">
                      Go to {selected.title}
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
      {!selected ? (
        <p className="mt-5 text-center text-sm text-fix-text-muted">
          Click any module to learn more — then go there or tap outside to close.
        </p>
      ) : null}
    </div>
  );
}
