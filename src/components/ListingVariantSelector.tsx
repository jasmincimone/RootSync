"use client";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export type ListingVariant = {
  id: string;
  title: string;
  priceCents: number;
  durationMinutes: number | null;
  sku: string | null;
};

type Props = {
  variants: ListingVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  listingType: string;
  className?: string;
};

export function ListingVariantSelector({
  variants,
  selectedId,
  onSelect,
  listingType,
  className,
}: Props) {
  if (variants.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-fix-heading">Choose an option</p>
      <ul className="mt-3 space-y-2">
        {variants.map((v) => {
          const selected = selectedId === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onSelect(v.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-amber/50 bg-amber/10 ring-1 ring-amber/30"
                    : "border-fix-border/20 bg-fix-surface hover:bg-fix-bg-muted",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-fix-heading">{v.title}</span>
                  <span className="font-semibold text-fix-heading">{formatPrice(v.priceCents)}</span>
                </div>
                {listingType === "SERVICE" && v.durationMinutes ? (
                  <p className="mt-1 text-xs font-medium text-fix-text-muted">
                    {v.durationMinutes} min session
                  </p>
                ) : null}
                {v.sku ? (
                  <p className="mt-1 text-xs text-fix-text-muted">SKU: {v.sku}</p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
