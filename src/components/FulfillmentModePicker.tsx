"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { formatFlatShippingLabel } from "@/lib/checkoutFulfillment";
import type { CheckoutFulfillmentMode } from "@/lib/checkoutFulfillment";

type Props = {
  value: CheckoutFulfillmentMode | null;
  onChange: (mode: CheckoutFulfillmentMode) => void;
  offersLocalPickup: boolean;
  pickupLocation?: string | null;
  shippingFlatCents?: number | null;
  className?: string;
};

/**
 * Explicit pickup (market / in-person) vs ship-to-home choice before Stripe Checkout.
 */
export function FulfillmentModePicker({
  value,
  onChange,
  offersLocalPickup,
  pickupLocation = null,
  shippingFlatCents = null,
  className,
}: Props) {
  const pickupHint = pickupLocation?.trim()
    ? `Pick up at ${pickupLocation.trim()}`
    : "Farmers markets, Invest Fest, booth pickup";
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
  }, [value, offersLocalPickup, shippingFlatCents]);

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-fix-heading">How do you want your order?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {offersLocalPickup ? (
          <button
            type="button"
            onClick={() => onChange("pickup")}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              value === "pickup"
                ? "border-forest bg-forest/10 ring-1 ring-forest/30"
                : "border-fix-border/20 bg-fix-surface hover:bg-fix-bg-muted",
            )}
          >
            <span className="block text-sm font-semibold text-fix-heading">
              Pickup / in person
            </span>
            <span className="mt-0.5 block text-xs text-fix-text-muted">{pickupHint}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onChange("ship")}
          className={cn(
            "rounded-xl border px-3 py-3 text-left transition-colors",
            value === "ship"
              ? "border-forest bg-forest/10 ring-1 ring-forest/30"
              : "border-fix-border/20 bg-fix-surface hover:bg-fix-bg-muted",
            !offersLocalPickup && "sm:col-span-2",
          )}
        >
          <span className="block text-sm font-semibold text-fix-heading">Ship / deliver</span>
          <span className="mt-0.5 block text-xs text-fix-text-muted">
            Home or a friend · {formatFlatShippingLabel(shippingFlatCents)}
          </span>
        </button>
      </div>
    </div>
  );
}
