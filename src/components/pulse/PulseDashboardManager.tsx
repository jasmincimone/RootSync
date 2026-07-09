"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { DashboardWidgetRow } from "@/lib/pulse/ticker";

type Props = {
  onClose: () => void;
};

export function PulseDashboardManager({ onClose }: Props) {
  const router = useRouter();
  const [widgets, setWidgets] = useState<DashboardWidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pulse/dashboard-widgets");
      if (!res.ok) throw new Error("Failed to load widgets");
      const data = (await res.json()) as { widgets: DashboardWidgetRow[] };
      setWidgets(data.widgets);
    } catch {
      setError("Could not load widget configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: DashboardWidgetRow[]) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/pulse/dashboard-widgets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: next.map((w, i) => ({
              id: w.id,
              enabled: w.enabled,
              sortOrder: i,
            })),
          }),
        });
        if (!res.ok) throw new Error("Save failed");
        setWidgets(next);
        router.refresh();
      } catch {
        setError("Could not save changes. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    void persist(next);
  };

  const toggle = (index: number) => {
    const next = widgets.map((w, i) => (i === index ? { ...w, enabled: !w.enabled } : w));
    void persist(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-clay">Dashboard widgets</p>
          <p className="mt-0.5 text-xs text-clay/70">
            Control which ecosystem metrics appear in the ticker bar. Statistics are live — you manage
            presentation only.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-clay/70 hover:bg-white/10 hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
          aria-label="Close widget manager"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-clay/70">Loading widgets…</p>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-amber">{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {widgets.map((widget, index) => (
            <li
              key={widget.id}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-clay"
            >
              <div className="min-w-0">
                <p className="font-medium">{widget.label}</p>
                <p className="text-xs text-clay/60">{widget.key}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={saving || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                  aria-label={`Move ${widget.label} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={saving || index === widgets.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                  aria-label={`Move ${widget.label} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => toggle(index)}
                  className="rounded p-1.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                  aria-label={widget.enabled ? `Hide ${widget.label}` : `Show ${widget.label}`}
                >
                  {widget.enabled ? (
                    <Eye className="h-4 w-4 text-amber" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-clay/50" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {saving ? <p className="text-xs text-clay/60">Saving…</p> : null}
    </div>
  );
}
