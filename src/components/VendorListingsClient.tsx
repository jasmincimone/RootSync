"use client";

import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { OfferingStatusBadge } from "@/components/ui/StatusBadge";
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
};

export function VendorListingsClient({ hideHeader = false }: { hideHeader?: boolean }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {!hideHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fix-heading">My offerings</h2>
            <p className="mt-1 text-sm text-fix-text-muted">
              Manage offerings and their public listings.
            </p>
          </div>
          <ButtonLink href="/account/vendor/listings/new" variant="cta" size="sm">
            New offering
          </ButtonLink>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <CardListSkeleton count={3} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No offerings yet"
          description="Create your first listing to appear on the marketplace — products, services, resources, or events."
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
                      // eslint-disable-next-line @next/next/no-img-element -- listing thumb from public or external URL
                      <img
                        src={l.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
                    {(l.paymentUrl || l.productUrl) && (
                      <div className="mt-0.5 text-xs text-fix-text-muted">
                        {l.paymentUrl ? "Payment link set" : ""}
                        {l.paymentUrl && l.productUrl ? " · " : ""}
                        {l.productUrl ? "Product link set" : ""}
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
