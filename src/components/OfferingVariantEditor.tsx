"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { SerializedOfferingVariant } from "@/lib/offeringVariants";
import { LISTING_TYPE } from "@/lib/roles";

export type VariantDraft = {
  clientKey: string;
  title: string;
  priceDollars: string;
  durationMinutes: string;
  sku: string;
  inventoryQuantity: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text";

function newDraft(): VariantDraft {
  return {
    clientKey: crypto.randomUUID(),
    title: "",
    priceDollars: "",
    durationMinutes: "",
    sku: "",
    inventoryQuantity: "",
  };
}

export function draftsFromSerialized(variants: SerializedOfferingVariant[]): VariantDraft[] {
  if (variants.length === 0) return [];
  return variants.map((v) => ({
    clientKey: v.id,
    title: v.title,
    priceDollars: (v.priceCents / 100).toFixed(2),
    durationMinutes: v.durationMinutes?.toString() ?? "",
    sku: v.sku ?? "",
    inventoryQuantity: v.inventoryQuantity != null ? String(v.inventoryQuantity) : "",
  }));
}

export function draftsToPayload(
  drafts: VariantDraft[],
  listingType: string,
): Array<{
  title: string;
  priceCents: number;
  durationMinutes?: number | null;
  sku?: string | null;
  inventoryQuantity?: number | null;
  sortOrder: number;
}> {
  return drafts.map((d, index) => {
    const priceCents = Math.round(Number.parseFloat(d.priceDollars || "0") * 100);
    const durationMinutes = d.durationMinutes.trim()
      ? Number.parseInt(d.durationMinutes, 10)
      : null;
    return {
      title: d.title.trim(),
      priceCents,
      durationMinutes: listingType === LISTING_TYPE.SERVICE ? durationMinutes : null,
      sku: listingType === LISTING_TYPE.PRODUCT ? d.sku.trim() || null : null,
      inventoryQuantity:
        listingType === LISTING_TYPE.PRODUCT && d.inventoryQuantity.trim()
          ? Number.parseInt(d.inventoryQuantity, 10)
          : null,
      sortOrder: index,
    };
  });
}

function moveVariant(variants: VariantDraft[], index: number, direction: -1 | 1): VariantDraft[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= variants.length) return variants;
  const next = [...variants];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

type Props = {
  listingType: string;
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  disabled?: boolean;
};

export function OfferingVariantEditor({ listingType, variants, onChange, disabled }: Props) {
  const showDuration = listingType === LISTING_TYPE.SERVICE;
  const showSku = listingType === LISTING_TYPE.PRODUCT;
  const isEvent = listingType === LISTING_TYPE.EVENT;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-fix-heading">
          {isEvent ? "Ticket tiers" : "Options & variations"}
        </h3>
        <p className="mt-1 text-xs text-fix-text-muted">
          {isEvent
            ? "One event, multiple ticket types — General Admission, VIP, Diamond, Platinum, Lifetime, etc. Shared schedule and attendance apply to all."
            : `One offering, multiple choices — each with its own name and price${
                showDuration ? " and session length" : ""
              }. Shared description, image, and availability apply to all. Describe what each option includes in your listing description above.`}
        </p>
        {variants.length > 1 ? (
          <p className="mt-1 text-xs text-fix-text-muted">
            Use the arrows to set the order Members see when choosing an option.
          </p>
        ) : null}
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-fix-text-muted">
          {isEvent
            ? "No ticket tiers yet — uses the single price above. Add options for General Admission, VIP, and more."
            : "No variations — uses the single price above. Add options for tiers like Seed Session / Garden Blueprint."}
        </p>
      ) : (
        <ul className="space-y-3">
          {variants.map((v, index) => (
            <li
              key={v.clientKey}
              className="rounded-lg border border-fix-border/15 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">
                  Option {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  {variants.length > 1 ? (
                    <>
                      <button
                        type="button"
                        disabled={disabled || index === 0}
                        onClick={() => onChange(moveVariant(variants, index, -1))}
                        className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                        aria-label={`Move option ${index + 1} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || index === variants.length - 1}
                        onClick={() => onChange(moveVariant(variants, index, 1))}
                        className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                        aria-label={`Move option ${index + 1} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(variants.filter((row) => row.clientKey !== v.clientKey))}
                    className="px-1.5 text-xs text-fix-text-muted hover:text-bark"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fix-text">Title *</label>
                <input
                  value={v.title}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      variants.map((row) =>
                        row.clientKey === v.clientKey ? { ...row, title: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder={isEvent ? "e.g. General Admission" : "e.g. Seed Session"}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-fix-text">Price (USD) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={v.priceDollars}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        variants.map((row) =>
                          row.clientKey === v.clientKey
                            ? { ...row, priceDollars: e.target.value }
                            : row,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                </div>
                {showDuration ? (
                  <div>
                    <label className="block text-sm font-medium text-fix-text">Time (mins) *</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={v.durationMinutes}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(
                          variants.map((row) =>
                            row.clientKey === v.clientKey
                              ? { ...row, durationMinutes: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="60"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-fix-text-muted">
                      Use 30 or 60 for clean hour/half-hour slots (e.g. 9:00–10:00).
                    </p>
                  </div>
                ) : null}
                {showSku ? (
                  <div>
                    <label className="block text-sm font-medium text-fix-text">SKU</label>
                    <input
                      value={v.sku}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(
                          variants.map((row) =>
                            row.clientKey === v.clientKey ? { ...row, sku: e.target.value } : row,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                ) : null}
                {showSku ? (
                  <div>
                    <label className="block text-sm font-medium text-fix-text">Qty available</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={v.inventoryQuantity}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(
                          variants.map((row) =>
                            row.clientKey === v.clientKey
                              ? { ...row, inventoryQuantity: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Blank = product stock"
                      className={inputClass}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...variants, newDraft()])}
      >
        {isEvent ? "Add ticket tier" : "Add option"}
      </Button>
    </div>
  );
}
