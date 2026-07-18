"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GitBranch } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export type GrowthFunnelRow = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  isActive: boolean;
  contactCount: number;
  steps: Array<{ id: string; label: string; stepType: string; sortOrder: number }>;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

export function GrowthFunnelsClient({ initialFunnels }: { initialFunnels: GrowthFunnelRow[] }) {
  const router = useRouter();
  const [funnels, setFunnels] = useState(initialFunnels);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-fix-heading">Create funnel</h2>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Objective</label>
          <input
            className={inputClass}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Book consultations, sell kits…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Description</label>
          <textarea
            className={inputClass + " min-h-[72px]"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/growth/funnels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, objective }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? "Could not create funnel");
                return;
              }
              const f = data.funnel;
              setFunnels((prev) => [
                {
                  id: f.id,
                  name: f.name,
                  description: f.description,
                  objective: f.objective,
                  isActive: f.isActive,
                  contactCount: 0,
                  steps: f.steps ?? [],
                },
                ...prev,
              ]);
              setName("");
              setDescription("");
              setObjective("");
              router.refresh();
            });
          }}
        >
          Create funnel
        </Button>
      </Card>

      {funnels.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No funnels yet"
          description="Create a funnel to map the path from first touch to conversion."
        />
      ) : (
        <ul className="space-y-3">
          {funnels.map((funnel) => (
            <li key={funnel.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-fix-heading">{funnel.name}</h3>
                    {funnel.objective ? (
                      <p className="mt-0.5 text-sm text-fix-text-muted">{funnel.objective}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-fix-text-muted">
                      {funnel.isActive ? "Active" : "Paused"} · {funnel.contactCount} contacts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          await fetch(`/api/growth/funnels/${funnel.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isActive: !funnel.isActive }),
                          });
                          setFunnels((prev) =>
                            prev.map((f) =>
                              f.id === funnel.id ? { ...f, isActive: !f.isActive } : f,
                            ),
                          );
                          router.refresh();
                        });
                      }}
                    >
                      {funnel.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await fetch(`/api/growth/funnels/${funnel.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) {
                            setFunnels((prev) => prev.filter((f) => f.id !== funnel.id));
                            router.refresh();
                          }
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <ol className="space-y-1 border-t border-fix-border/15 pt-3 text-sm text-fix-text-muted">
                  {funnel.steps.map((step, index) => (
                    <li key={step.id}>
                      {index + 1}. {step.label}{" "}
                      <span className="text-xs">({step.stepType})</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
