"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { ROLES } from "@/lib/roles";
import { SHOPS } from "@/config/shops";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  createdAt: string;
  vendorProfile: { status: string; shopSlug: string | null } | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setRole(userId: string, role: string) {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to update");
      return;
    }
    await load();
  }

  async function setVendorShop(userId: string, shopSlug: string | null) {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorShopSlug: shopSlug }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to update shop");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Users & roles</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Change customer / vendor / admin. Set a legacy /shops/… slug only when a vendor needs an
          old public URL (e.g. /shops/urban-roots) to redirect to their marketplace profile.
        </p>
      </div>

      {error && <p className="text-sm text-bark">{error}</p>}

      {loading ? (
        <p className="text-sm text-fix-text-muted">Loading…</p>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-fix-border/15">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-fix-heading">{u.email}</div>
                  <div className="text-xs text-fix-text-muted">
                    {u.role}
                    {u.vendorProfile ? ` • vendor: ${u.vendorProfile.status}` : ""}
                    {u.vendorProfile?.shopSlug ? ` • shop: ${u.vendorProfile.shopSlug}` : ""}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  {u.vendorProfile ? (
                    <label className="flex items-center gap-2 text-xs text-fix-text-muted">
                      <span className="shrink-0 font-medium text-fix-heading">Legacy /shops URL</span>
                      <select
                        value={u.vendorProfile.shopSlug ?? ""}
                        onChange={(e) =>
                          setVendorShop(u.id, e.target.value === "" ? null : e.target.value)
                        }
                        className="rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1 text-xs text-fix-text"
                      >
                        <option value="">None</option>
                        {SHOPS.map((shop) => (
                          <option key={shop.slug} value={shop.slug}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1 text-xs font-medium text-fix-heading hover:bg-fix-bg-muted"
                    onClick={() => setRole(u.id, ROLES.CUSTOMER)}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1 text-xs font-medium text-fix-heading hover:bg-fix-bg-muted"
                    onClick={() => setRole(u.id, ROLES.VENDOR)}
                  >
                    Vendor
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1 text-xs font-medium text-fix-heading hover:bg-fix-bg-muted"
                    onClick={() => setRole(u.id, ROLES.ADMIN)}
                  >
                    Admin
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
