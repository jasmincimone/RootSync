"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PageBody } from "@/components/ui/PageBody";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";

type Row = {
  id: string;
  userId: string;
  displayName: string;
  status: string;
  user: { id: string; email: string | null; name: string | null; role: string };
};

type DirectoryClaimRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  claimRequestedAt: string | null;
  claimRequestedBy: {
    id: string;
    email: string | null;
    name: string | null;
    vendorProfile: { id: string; status: string; displayName: string } | null;
  } | null;
};

type PosVendorRow = {
  userId: string;
  displayName: string;
  email: string;
  connectAccountId: string | null;
  counterReady: boolean;
  connectReady: boolean;
  hasSellableListing: boolean;
  hasTerminalSale: boolean;
};

export default function AdminVendorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [directoryClaims, setDirectoryClaims] = useState<DirectoryClaimRow[]>([]);
  const [posVendors, setPosVendors] = useState<PosVendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/vendors");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.vendors ?? []);
      setDirectoryClaims(data.directoryClaims ?? []);
      setPosVendors(data.posVendors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(userId: string, action: "approve" | "reject") {
    setError(null);
    const res = await fetch(`/api/admin/vendors/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    await load();
  }

  async function actOnDirectoryClaim(id: string, action: "approve" | "reject") {
    setError(null);
    const res = await fetch(`/api/admin/directory-claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    await load();
  }

  return (
    <PageBody wide description="Vendor applications, directory claims, and POS readiness.">
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading ? (
        <CardListSkeleton count={3} />
      ) : rows.length === 0 && directoryClaims.length === 0 && posVendors.length === 0 ? (
        <EmptyState
          title="No vendor activity"
          description="New Vendor applications, Directory claims, and approved vendors will appear here."
        />
      ) : (
        <div className="space-y-8">
          {directoryClaims.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-semibold text-fix-heading">Directory claims</h2>
              <ul className="space-y-4">
                {directoryClaims.map((claim) => (
                  <li key={claim.id}>
                    <Card className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Link
                            href={`/discover/directory/${claim.id}`}
                            className="font-semibold text-fix-link hover:text-fix-link-hover"
                          >
                            {claim.name}
                          </Link>
                          <div className="mt-1 text-sm text-fix-text-muted">
                            {[claim.city, claim.state].filter(Boolean).join(", ") || "Location unavailable"}
                          </div>
                          <div className="mt-2 text-sm text-fix-text-muted">
                            Requested by {claim.claimRequestedBy?.name || claim.claimRequestedBy?.email || "Unknown member"}
                          </div>
                          <div className="text-xs text-fix-text-muted">
                            Vendor status: {claim.claimRequestedBy?.vendorProfile?.status ?? "No application"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="cta"
                            size="sm"
                            onClick={() => actOnDirectoryClaim(claim.id, "approve")}
                          >
                            Approve claim
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => actOnDirectoryClaim(claim.id, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {rows.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-semibold text-fix-heading">Vendor applications</h2>
              <ul className="space-y-4">
                {rows.map((v) => (
                  <li key={v.id}>
                    <Card className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-fix-heading">{v.displayName}</div>
                          <div className="mt-1 text-sm text-fix-text-muted">{v.user.email}</div>
                          {v.user.name && (
                            <div className="text-sm text-fix-text-muted">{v.user.name}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="cta" size="sm" onClick={() => act(v.userId, "approve")}>
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => act(v.userId, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {posVendors.length > 0 ? (
            <section>
              <h2 className="mb-3 text-base font-semibold text-fix-heading">POS readiness</h2>
              <p className="mb-3 text-sm text-fix-text-muted">
                Approved vendors — Counter/M2 backend ready when Connect charges are enabled. No
                manual flag; status is live from Stripe + RootSync.
              </p>
              <ul className="space-y-3">
                {posVendors.map((v) => (
                  <li key={v.userId}>
                    <Card className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-fix-heading">{v.displayName}</div>
                          <div className="mt-1 text-sm text-fix-text-muted">{v.email}</div>
                          <div className="mt-1 font-mono text-xs text-fix-text-muted">
                            {v.connectAccountId || "No Connect account"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span
                            className={
                              v.counterReady
                                ? "rounded-full bg-forest/15 px-2.5 py-1 font-medium text-forest"
                                : "rounded-full bg-fix-bg-muted px-2.5 py-1 font-medium text-fix-text-muted"
                            }
                          >
                            {v.counterReady ? "Counter ready" : "Connect incomplete"}
                          </span>
                          <span className="rounded-full bg-fix-bg-muted px-2.5 py-1 font-medium text-fix-text-muted">
                            {v.hasSellableListing ? "Has ACTIVE listing" : "No sellable listing"}
                          </span>
                          <span className="rounded-full bg-fix-bg-muted px-2.5 py-1 font-medium text-fix-text-muted">
                            {v.hasTerminalSale ? "M2 sale done" : "No M2 sale yet"}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageBody>
  );
}
