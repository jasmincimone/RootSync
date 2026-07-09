"use client";

import { useCallback, useEffect, useState } from "react";

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

export default function AdminVendorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
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

  return (
    <PageBody wide description="Pending Discover vendor applications.">
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading ? (
        <CardListSkeleton count={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No pending applications"
          description="New vendor applications will appear here for review."
        />
      ) : (
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
      )}
    </PageBody>
  );
}
