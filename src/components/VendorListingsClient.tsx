"use client";

import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { OfferingStatusBadge } from "@/components/ui/StatusBadge";
import { ListingImage } from "@/components/ListingImage";
import { formatPrice } from "@/lib/format";
import { listingTypeLabel } from "@/lib/listingDisplay";

type Listing = {
  id: string;
  title: string;
  listingType: string;
  status: string;
  priceCents: number;
  updatedAt: string;
  imageUrl: string | null;
  paymentUrl: string | null;
  productUrl: string | null;
  stripeProductId?: string | null;
};

export function VendorListingsClient({ hideHeader = false }: { hideHeader?: boolean }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/listings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setListings(data.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncFromStripe() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/connect/products/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Failed to sync listings from Stripe.");
        return;
      }
      setSyncMessage(data.message || "Synced listings from Stripe.");
      await load();
    } catch {
      setError("Failed to sync listings from Stripe.");
    } finally {
      setSyncing(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={syncing || loading}
        onClick={() => void syncFromStripe()}
      >
        {syncing ? "Syncing…" : "Sync listings from Stripe"}
      </Button>
      <ButtonLink href="/account/vendor/listings/new" variant="cta" size="sm">
        New Listing
      </ButtonLink>
    </div>
  );

  return (
    <div className="space-y-6">
      {!hideHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fix-heading">My offerings</h2>
            <p className="mt-1 text-sm text-fix-text-muted">
              Manage offerings and their public listings. Sync pulls products from your Stripe
              Dashboard.
            </p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      )}

      <FormFeedback success={syncMessage} error={null} />
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <CardListSkeleton count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No offerings yet"
          description="Create a listing here, or sync products you already created in the Stripe Dashboard."
          action={{
            href: "/account/vendor/listings/new",
            label: "Create offering",
            variant: "cta",
          }}
        />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-fix-border/20 bg-fix-bg-muted">
                    {l.imageUrl ? (
                      <ListingImage src={l.imageUrl} alt="" />
                    ) : (
                      <ImageIcon
                        className="h-6 w-6 text-fix-text-muted/60"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-fix-heading">{l.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-fix-text-muted">{listingTypeLabel(l.listingType)}</span>
                      <OfferingStatusBadge status={l.status} />
                      <span className="text-xs text-fix-text-muted">{formatPrice(l.priceCents)}</span>
                    </div>
                    {(l.paymentUrl || l.productUrl || l.stripeProductId) && (
                      <div className="mt-0.5 text-xs text-fix-text-muted">
                        {[
                          l.stripeProductId ? "Stripe product synced" : null,
                          l.paymentUrl ? "Payment link set" : null,
                          l.productUrl ? "Product link set" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={`/account/vendor/listings/${l.id}/edit`}
                  className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
                >
                  Edit
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
