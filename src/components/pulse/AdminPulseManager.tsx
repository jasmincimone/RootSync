"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import type { AdminPulseConfig } from "@/lib/pulse/adminConfig";
import { cn } from "@/lib/cn";

type Tab =
  | "eventWeights"
  | "categories"
  | "thresholds"
  | "platformWeights"
  | "platformThresholds"
  | "announcements";

const TABS: { id: Tab; label: string }[] = [
  { id: "eventWeights", label: "Event weights" },
  { id: "categories", label: "Categories" },
  { id: "thresholds", label: "Member tiers" },
  { id: "platformWeights", label: "Platform inputs" },
  { id: "platformThresholds", label: "Platform tiers" },
  { id: "announcements", label: "Announcements" },
];

type Props = {
  initial: AdminPulseConfig;
};

export function AdminPulseManager({ initial }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(initial);
  const [tab, setTab] = useState<Tab>("eventWeights");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const save = useCallback(
    async (section: Tab, updates: Record<string, unknown>[]) => {
      setSaving(true);
      setError(null);
      setSuccess(null);
      try {
        const res = await fetch("/api/admin/pulse/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, updates }),
        });
        const data = (await res.json()) as AdminPulseConfig & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Save failed");
          return;
        }
        setConfig(data);
        setSuccess("Saved");
        router.refresh();
      } catch {
        setError("Save failed. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <Card className="border-amber/25 bg-amber/5 p-4">
        <p className="text-sm text-fix-heading">
          Configure Pulse presentation and weighting — not live statistics. Dashboard ticker widgets
          are managed from the{" "}
          <span className="font-medium">gear icon on the ecosystem ticker bar</span>.
        </p>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber",
              tab === t.id
                ? "bg-forest text-clay"
                : "bg-fix-bg-muted text-fix-text-muted hover:text-fix-heading",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FormFeedback success={success} error={error} />

      {tab === "eventWeights" ? (
        <ConfigTable
          title="Event weights"
          description="Pulse value awarded per event type. Never hardcode these in feature code."
          saving={saving}
          rows={config.eventWeights}
          columns={[
            { key: "eventType", label: "Event", readOnly: true },
            { key: "categoryLabel", label: "Category", readOnly: true },
            { key: "pulseValue", label: "Pulse", type: "number" },
            { key: "enabled", label: "Enabled", type: "boolean" },
            { key: "description", label: "Description" },
          ]}
          onSave={(updates) => void save("eventWeights", updates)}
        />
      ) : null}

      {tab === "categories" ? (
        <ConfigTable
          title="Event categories"
          description="Group Pulse events for workspace breakdowns."
          saving={saving}
          rows={config.categories}
          columns={[
            { key: "key", label: "Key", readOnly: true },
            { key: "label", label: "Label" },
            { key: "sortOrder", label: "Order", type: "number" },
            { key: "enabled", label: "Enabled", type: "boolean" },
          ]}
          onSave={(updates) => void save("categories", updates)}
        />
      ) : null}

      {tab === "thresholds" ? (
        <ConfigTable
          title="Member status tiers"
          description="Individual Pulse status thresholds (lifetime score)."
          saving={saving}
          rows={config.thresholds}
          columns={[
            { key: "status", label: "Status", readOnly: true },
            { key: "emoji", label: "Emoji" },
            { key: "label", label: "Label" },
            { key: "minScore", label: "Min score", type: "number" },
            { key: "sortOrder", label: "Order", type: "number" },
          ]}
          onSave={(updates) => void save("thresholds", updates)}
        />
      ) : null}

      {tab === "platformWeights" ? (
        <ConfigTable
          title="Platform Pulse inputs"
          description="Weighted metrics for the ecosystem vitality index."
          saving={saving}
          rows={config.platformWeights}
          columns={[
            { key: "metricKey", label: "Metric", readOnly: true },
            { key: "weight", label: "Weight", type: "number" },
            { key: "enabled", label: "Enabled", type: "boolean" },
            { key: "description", label: "Description" },
          ]}
          onSave={(updates) => void save("platformWeights", updates)}
        />
      ) : null}

      {tab === "platformThresholds" ? (
        <ConfigTable
          title="Platform status tiers"
          description="Labels for the 0 – 1,000,000 Platform Pulse scale."
          saving={saving}
          rows={config.platformThresholds}
          columns={[
            { key: "status", label: "Status", readOnly: true },
            { key: "emoji", label: "Emoji" },
            { key: "label", label: "Label" },
            { key: "minValue", label: "Min value", type: "number" },
            { key: "sortOrder", label: "Order", type: "number" },
          ]}
          onSave={(updates) => void save("platformThresholds", updates)}
        />
      ) : null}

      {tab === "announcements" ? (
        <AnnouncementsPanel
          key={config.announcements.map((a) => a.id).join("-")}
          rows={config.announcements}
          saving={saving}
          onSave={(updates) => void save("announcements", updates)}
        />
      ) : null}

      <p className="text-xs text-fix-text-muted">
        <Link href="/rootsync/dashboard" className="font-medium text-fix-link hover:text-fix-link-hover">
          View ecosystem dashboard
        </Link>
        {" · "}
        <Link href="/account/admin" className="font-medium text-fix-link hover:text-fix-link-hover">
          Admin hub
        </Link>
      </p>
    </div>
  );
}

type Column = {
  key: string;
  label: string;
  type?: "number" | "boolean";
  readOnly?: boolean;
};

function ConfigTable({
  title,
  description,
  rows,
  columns,
  saving,
  onSave,
}: {
  title: string;
  description: string;
  rows: Record<string, unknown>[];
  columns: Column[];
  saving: boolean;
  onSave: (updates: Record<string, unknown>[]) => void;
}) {
  const [draft, setDraft] = useState(rows);

  useEffect(() => {
    setDraft(rows);
  }, [rows]);

  function updateRow(index: number, key: string, value: unknown) {
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-fix-border/15 px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-fix-heading">{title}</h2>
        <p className="mt-0.5 text-sm text-fix-text-muted">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-fix-border/15 bg-fix-bg-muted/40 text-left text-xs uppercase tracking-wide text-fix-text-muted">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.map((row, index) => (
              <tr key={String(row.id)} className="border-b border-fix-border/10">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {col.readOnly ? (
                      <span className="text-fix-text-muted">{String(row[col.key] ?? "")}</span>
                    ) : col.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(row[col.key])}
                        onChange={(e) => updateRow(index, col.key, e.target.checked)}
                        className="h-4 w-4 rounded border-fix-border/30"
                      />
                    ) : col.type === "number" ? (
                      <input
                        type="number"
                        value={Number(row[col.key] ?? 0)}
                        onChange={(e) => updateRow(index, col.key, Number(e.target.value))}
                        className="w-24 rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1"
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(row[col.key] ?? "")}
                        onChange={(e) => updateRow(index, col.key, e.target.value)}
                        className="min-w-[8rem] rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end border-t border-fix-border/15 px-4 py-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => onSave(draft.map((r) => ({ id: r.id, ...r })))}
        >
          <Save className="h-4 w-4" aria-hidden />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function AnnouncementsPanel({
  rows,
  saving,
  onSave,
}: {
  rows: AdminPulseConfig["announcements"];
  saving: boolean;
  onSave: (updates: Record<string, unknown>[]) => void;
}) {
  const [draft, setDraft] = useState(rows);

  useEffect(() => {
    setDraft(rows);
  }, [rows]);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fix-heading">Dashboard announcements</h2>
          <p className="mt-0.5 text-sm text-fix-text-muted">
            Optional messages for the public ecosystem dashboard and ticker.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onSave([
              {
                _create: true,
                title: "New announcement",
                body: "",
                enabled: true,
                sortOrder: draft.length,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      <ul className="mt-4 space-y-3">
        {draft.map((row, index) => (
          <li key={row.id} className="rounded-xl border border-fix-border/15 p-3">
            <input
              type="text"
              value={row.title}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)),
                )
              }
              className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1 text-sm font-medium"
            />
            <textarea
              value={row.body ?? ""}
              onChange={(e) =>
                setDraft((prev) =>
                  prev.map((r, i) => (i === index ? { ...r, body: e.target.value } : r)),
                )
              }
              rows={2}
              className="mt-2 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1 text-sm"
              placeholder="Message body"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, enabled: e.target.checked } : r)),
                    )
                  }
                />
                Enabled
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSave([{ id: row.id, _delete: true }])}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => onSave(draft.map((r) => ({ ...r })))}
        >
          {saving ? "Saving…" : "Save announcements"}
        </Button>
      </div>
    </Card>
  );
}
