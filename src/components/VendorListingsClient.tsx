"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Image as ImageIcon } from "lucide-react";
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
  sortOrder?: number;
};

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Server returned an invalid response."
        : `Request failed (HTTP ${res.status}). Try refreshing after deploy finishes.`,
    );
  }
}

function moveListingInList(list: Listing[], id: string, direction: -1 | 1): Listing[] | null {
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return null;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export function VendorListingsClient({ hideHeader = false }: { hideHeader?: boolean }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const busy = pulling || pushing || loading || !!deletingId || reordering;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/listings");
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load listings.",
        );
      }
      setListings(Array.isArray(data.listings) ? (data.listings as Listing[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persistOrder(next: Listing[]) {
    setReordering(true);
    setError(null);
    const previous = listings;
    setListings(next);
    try {
      const res = await fetch("/api/vendor/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: next.map((row) => row.id) }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setListings(previous);
        setError(typeof data.error === "string" ? data.error : "Failed to reorder listings.");
      }
    } catch (e) {
      setListings(previous);
      setError(e instanceof Error ? e.message : "Failed to reorder listings.");
    } finally {
      setReordering(false);
    }
  }

  async function moveListing(id: string, direction: -1 | 1) {
    const next = moveListingInList(listings, id, direction);
    if (!next) return;
    await persistOrder(next);
  }

  async function deleteListing(id: string, title: string) {
    const ok = window.confirm(
      `Delete “${title}” permanently?\n\nThis cannot be undone. Prefer Archive from Edit if you might offer it again.`,
    );
    if (!ok) return;

    setDeletingId(id);
    setError(null);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/vendor/listings/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to delete listing.");
        return;
      }
      setSyncMessage("Listing deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete listing.");
    } finally {
      setDeletingId(null);
    }
  }

  async function syncFromStripe() {
    setPulling(true);
    setError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/connect/products/sync", { method: "POST" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to sync listings from Stripe.",
        );
        return;
      }
      setSyncMessage(
        typeof data.message === "string" ? data.message : "Synced listings from Stripe.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sync listings from Stripe.");
    } finally {
      setPulling(false);
    }
  }

  async function pushToStripe() {
    setPushing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/connect/products/push", { method: "POST" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Failed to push listings to Stripe.",
        );
        return;
      }
      const errors = Array.isArray(data.errors)
        ? data.errors.filter((e): e is string => typeof e === "string")
        : [];
      const detail = errors.length > 0 ? ` ${errors.join(" · ")}` : "";
      const message =
        typeof data.message === "string" ? data.message : "Pushed listings to Stripe.";
      if (typeof data.failed === "number" && data.failed > 0) {
        setError(message + detail);
      } else {
        setSyncMessage(message + detail);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to push listings to Stripe.");
    } finally {
      setPushing(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => void syncFromStripe()}
      >
        {pulling ? "Pulling…" : "Sync listings from Stripe"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || listings.length === 0}
        onClick={() => void pushToStripe()}
      >
        {pushing ? "Pushing…" : "Push listings to Stripe"}
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
              Manage offerings and their public listings. Use the arrows to set storefront order.{" "}
              <span className="font-medium text-fix-heading">Sync from Stripe</span> pulls
              Dashboard/Payment Hub products into RootSync.{" "}
              <span className="font-medium text-fix-heading">Push to Stripe</span> creates or
              updates Products on your connected Stripe account.
            </p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
          {listings.length > 1 ? (
            <p className="text-xs text-fix-text-muted">
              Use the arrows to reorder listings on your public storefront.
            </p>
          ) : null}
        </div>
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
          {listings.map((l, index) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => void moveListing(l.id, -1)}
                      className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                      aria-label={`Move ${l.title} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === listings.length - 1}
                      onClick={() => void moveListing(l.id, 1)}
                      className="rounded-lg border border-fix-border/20 p-1.5 text-fix-text-muted hover:bg-fix-surface disabled:opacity-40"
                      aria-label={`Move ${l.title} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
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
                      <span className="text-xs text-fix-text-muted">
                        {listingTypeLabel(l.listingType)}
                      </span>
                      <OfferingStatusBadge status={l.status} />
                      <span className="text-xs text-fix-text-muted">
                        {formatPrice(l.priceCents)}
                      </span>
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
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <Link
                    href={`/account/vendor/listings/${l.id}/edit`}
                    className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteListing(l.id, l.title)}
                    className="text-sm font-medium text-bark hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === l.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
