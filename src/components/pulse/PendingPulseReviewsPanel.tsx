"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VendorPulseReviewForm } from "@/components/pulse/VendorPulseReviewForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type PendingItem = {
  vendorProfileId: string;
  vendorName: string;
  listingTitle: string | null;
  orderId?: string;
  bookingId?: string;
  date: string;
};

export function PendingPulseReviewsPanel() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/account/pulse-reviews/pending");
        if (!res.ok) return;
        const data = (await res.json()) as { pending: PendingItem[] };
        setItems(data.pending);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-fix-text-muted">Loading review opportunities…</p>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 shadow-soft">
      <h2 className="text-base font-semibold text-fix-heading">Give a Pulse to vendors</h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        Share your experience after a purchase or consultation — Pulse reviews replace star ratings.
      </p>

      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const key = item.orderId ?? item.bookingId ?? item.vendorProfileId;
          const expanded = activeKey === key;

          return (
            <li key={key} className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/30 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-fix-heading">{item.vendorName}</p>
                  {item.listingTitle ? (
                    <p className="text-xs text-fix-text-muted">{item.listingTitle}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveKey(expanded ? null : key)}
                  >
                    {expanded ? "Cancel" : "Give a Pulse"}
                  </Button>
                  <Link
                    href={`/discover/vendors/${item.vendorProfileId}`}
                    className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    View vendor
                  </Link>
                </div>
              </div>

              {expanded ? (
                <div className="mt-4 border-t border-fix-border/15 pt-4">
                  <VendorPulseReviewForm
                    vendorProfileId={item.vendorProfileId}
                    vendorName={item.vendorName}
                    listingTitle={item.listingTitle}
                    orderId={item.orderId}
                    bookingId={item.bookingId}
                    onSuccess={() => {
                      setItems((prev) => prev.filter((p) => (p.orderId ?? p.bookingId) !== key));
                      setActiveKey(null);
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
