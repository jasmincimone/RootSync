"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";

type QueueOrder = {
  id: string;
  email: string;
  totalLabel: string;
  shippingLabel: string;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostal: string | null;
  shippingCountry: string | null;
  createdAt: string;
  shippedAt: string | null;
  vendorName: string | null;
  items: { id: string; name: string; quantity: number }[];
};

export default function AdminShippingQueuePage() {
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [shipped, setShipped] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shipping-queue");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to load");
      setQueue(Array.isArray(data.queue) ? data.queue : []);
      setShipped(Array.isArray(data.shipped) ? data.shipped : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markFulfilled(orderId: string) {
    setFulfillingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not mark shipped.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark shipped.");
    } finally {
      setFulfillingId(null);
    }
  }

  return (
    <PageBody description="Paid orders that chose Ship / deliver. Mark them fulfilled after you mail the package.">
      {error ? <ErrorBanner className="mb-4" message={error} /> : null}

      {loading ? (
        <CardListSkeleton />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders waiting to ship"
          description="When a customer pays and chooses ship / deliver, the order appears here and admins get an email."
        />
      ) : (
        <ul className="space-y-3">
          {queue.map((order) => (
            <li key={order.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-fix-heading">
                      {order.vendorName ?? "Marketplace order"} · {order.totalLabel}
                    </p>
                    <p className="text-xs text-fix-text-muted">
                      {new Date(order.createdAt).toLocaleString()} · shipping {order.shippingLabel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="cta"
                    size="sm"
                    disabled={fulfillingId === order.id}
                    onClick={() => void markFulfilled(order.id)}
                  >
                    {fulfillingId === order.id ? "Saving…" : "Mark fulfilled"}
                  </Button>
                </div>
                <p className="text-sm text-fix-text">
                  {order.shippingName}
                  {order.shippingName ? <br /> : null}
                  {order.shippingLine1}
                  {order.shippingLine2 ? (
                    <>
                      <br />
                      {order.shippingLine2}
                    </>
                  ) : null}
                  <br />
                  {[order.shippingCity, order.shippingState, order.shippingPostal]
                    .filter(Boolean)
                    .join(", ")}
                  {order.shippingCountry ? ` · ${order.shippingCountry}` : ""}
                </p>
                <p className="text-xs text-fix-text-muted">Buyer {order.email}</p>
                <ul className="text-sm text-fix-text">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {shipped.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-fix-heading">Recently fulfilled</h2>
          <ul className="mt-3 space-y-2">
            {shipped.map((order) => (
              <li key={order.id} className="text-sm text-fix-text-muted">
                {order.vendorName ?? "Order"} · {order.totalLabel} · shipped{" "}
                {order.shippedAt ? new Date(order.shippedAt).toLocaleDateString() : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-8 text-xs text-fix-text-muted">
        <Link href="/account/admin" className="font-medium text-fix-link hover:text-fix-link-hover">
          Back to Admin Hub
        </Link>
      </p>
    </PageBody>
  );
}
