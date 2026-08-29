"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { FunnelPagePreview } from "@/components/growth/FunnelPagePreview";
import { FUNNEL_TERM_CARDS } from "@/lib/growth/funnelGuide";
import type { FunnelPageContent } from "@/lib/growth/funnelPage";
import { vendorFunnelPublicPath } from "@/lib/growth/publicPath";
import { GROWTH_FUNNEL_STEP_TYPE_LABELS } from "@/lib/growth/roles";

export type GrowthFunnelRow = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  ctaLabel: string | null;
  publicSlug: string;
  isActive: boolean;
  assignDiscoverCheckout: boolean;
  contactCount: number;
  page: FunnelPageContent;
  steps: Array<{ id: string; label: string; stepType: string; sortOrder: number }>;
};

export type GrowthFunnelContactOption = {
  id: string;
  name: string;
  email: string;
  funnelId: string | null;
};

function stepTypeLabel(stepType: string) {
  return GROWTH_FUNNEL_STEP_TYPE_LABELS[
    stepType as keyof typeof GROWTH_FUNNEL_STEP_TYPE_LABELS
  ] ?? stepType;
}

function FunnelPreviewCard({
  name,
  objective,
  description,
  publicHref,
  isActive = true,
  contactCount = 0,
  checkout = false,
  steps,
  page,
  ctaLabel,
  children,
}: {
  name: string;
  objective: string;
  description: string;
  publicHref?: string | null;
  isActive?: boolean;
  contactCount?: number;
  checkout?: boolean;
  steps: Array<{ id?: string; label: string; stepType: string }>;
  page: FunnelPageContent;
  ctaLabel?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="font-semibold text-fix-heading">{name.trim() || "Untitled funnel"}</h3>
        {objective.trim() ? (
          <p className="mt-0.5 text-sm text-fix-text-muted">{objective.trim()}</p>
        ) : (
          <p className="mt-0.5 text-sm text-fix-text-muted">Add an objective to show it here.</p>
        )}
        {description.trim() ? (
          <p className="mt-1 text-sm text-fix-text">{description.trim()}</p>
        ) : null}
        {publicHref ? (
          <p className="mt-1 text-xs text-fix-text-muted">
            Public page:{" "}
            <a href={publicHref} className="text-fix-link underline" target="_blank" rel="noreferrer">
              {publicHref}
            </a>
          </p>
        ) : null}
        <p className="mt-1 text-xs text-fix-text-muted">
          {isActive ? "Active" : "Paused"} · {contactCount} contact{contactCount === 1 ? "" : "s"}
          {checkout ? " · New checkout buyers join this funnel" : ""}
        </p>
      </div>
      <ol className="space-y-1 border-t border-fix-border/15 pt-3 text-sm text-fix-text-muted">
        {steps.map((step, index) => (
          <li key={step.id ?? `${step.stepType}-${index}`}>
            {index + 1}. {step.label}{" "}
            <span className="text-xs">({stepTypeLabel(step.stepType)})</span>
          </li>
        ))}
      </ol>
      <div className="border-t border-fix-border/15 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fix-text-muted">
          Page preview
        </p>
        <FunnelPagePreview page={page} ctaLabel={ctaLabel} compact />
      </div>
      {children}
    </Card>
  );
}

export function GrowthFunnelsClient({
  initialFunnels,
  initialContacts,
  contactTotal,
  vendorPublicSlug,
}: {
  initialFunnels: GrowthFunnelRow[];
  initialContacts: GrowthFunnelContactOption[];
  contactTotal: number;
  vendorPublicSlug: string | null;
}) {
  const router = useRouter();
  const [funnels, setFunnels] = useState(initialFunnels);
  const [contacts, setContacts] = useState(initialContacts);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyAssignment(args: {
    funnelId: string;
    assignedIds: string[];
    assignedCount: number;
    allContacts?: boolean;
  }) {
    const moved = new Set(args.assignedIds);
    setContacts((prev) =>
      prev.map((contact) =>
        args.allContacts || moved.has(contact.id)
          ? { ...contact, funnelId: args.funnelId }
          : contact,
      ),
    );
    setFunnels((prev) =>
      prev.map((funnel) => {
        if (funnel.id === args.funnelId) {
          return { ...funnel, contactCount: args.assignedCount };
        }
        if (args.allContacts) {
          return { ...funnel, contactCount: 0 };
        }
        const movedFromThis = contacts.filter(
          (contact) => moved.has(contact.id) && contact.funnelId === funnel.id,
        ).length;
        return { ...funnel, contactCount: Math.max(0, funnel.contactCount - movedFromThis) };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FUNNEL_TERM_CARDS.map((term) => (
          <InfoPopover key={term.label} label={term.label} title={term.title}>
            {term.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </InfoPopover>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-fix-heading">Funnel design studio</h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Open the fullscreen studio to design pages with live preview, mobile frame, and
            drag-and-drop sections.
          </p>
        </div>
        <ButtonLink href="/account/growth/funnels/new/studio" variant="cta" size="sm">
          New funnel
        </ButtonLink>
      </Card>

      {funnels.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No funnels yet"
          description="Create a funnel to map the path from first touch to conversion."
        />
      ) : (
        <ul className="space-y-3">
          {funnels.map((funnel) => {
            const inThisFunnel = contacts.filter((contact) => contact.funnelId === funnel.id);
            const available = contacts.filter((contact) => contact.funnelId !== funnel.id);
            const open = assigningId === funnel.id;

            return (
              <li key={funnel.id}>
                <FunnelPreviewCard
                  name={funnel.name}
                  objective={funnel.objective ?? ""}
                  description={funnel.description ?? ""}
                  publicHref={
                    vendorPublicSlug && funnel.publicSlug
                      ? vendorFunnelPublicPath(vendorPublicSlug, funnel.publicSlug)
                      : null
                  }
                  isActive={funnel.isActive}
                  contactCount={funnel.contactCount}
                  checkout={funnel.assignDiscoverCheckout}
                  steps={funnel.steps}
                  page={funnel.page}
                  ctaLabel={funnel.ctaLabel}
                >
                  <div className="space-y-3 border-t border-fix-border/15 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <ButtonLink
                        href={`/account/growth/funnels/${funnel.id}/studio`}
                        variant="cta"
                        size="sm"
                      >
                        Open studio
                      </ButtonLink>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setAssignMessage(null);
                          setSelectedIds([]);
                          setAssigningId(open ? null : funnel.id);
                        }}
                      >
                        {open ? "Close assign" : "Assign contacts"}
                      </Button>
                      <Button
                        type="button"
                        variant={funnel.assignDiscoverCheckout ? "cta" : "secondary"}
                        size="sm"
                        disabled={pending}
                        aria-pressed={funnel.assignDiscoverCheckout}
                        onClick={() => {
                          startTransition(async () => {
                            const next = !funnel.assignDiscoverCheckout;
                            const res = await fetch(`/api/growth/funnels/${funnel.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ assignDiscoverCheckout: next }),
                            });
                            if (!res.ok) return;
                            setFunnels((prev) =>
                              prev.map((row) => ({
                                ...row,
                                assignDiscoverCheckout:
                                  row.id === funnel.id
                                    ? next
                                    : next
                                      ? false
                                      : row.assignDiscoverCheckout,
                              })),
                            );
                            router.refresh();
                          });
                        }}
                      >
                        {funnel.assignDiscoverCheckout ? "Checkout funnel" : "Use for checkout"}
                      </Button>
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
                              prev.map((row) =>
                                row.id === funnel.id ? { ...row, isActive: !row.isActive } : row,
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
                              setFunnels((prev) => prev.filter((row) => row.id !== funnel.id));
                              setContacts((prev) =>
                                prev.map((contact) =>
                                  contact.funnelId === funnel.id
                                    ? { ...contact, funnelId: null }
                                    : contact,
                                ),
                              );
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>

                    {open ? (
                      <div className="space-y-3">
                        <p className="text-sm text-fix-text-muted">
                          {inThisFunnel.length} already in this funnel
                          {available.length
                            ? ` · ${available.length} more in CRM`
                            : " · everyone in CRM is already here"}
                          . A contact can only be in one funnel.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={pending || contactTotal === 0}
                            onClick={() => {
                              setAssignMessage(null);
                              startTransition(async () => {
                                const res = await fetch(`/api/growth/funnels/${funnel.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ assignAllContacts: true }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  setAssignMessage(data.error ?? "Could not assign contacts.");
                                  return;
                                }
                                applyAssignment({
                                  funnelId: funnel.id,
                                  assignedIds: contacts.map((contact) => contact.id),
                                  assignedCount:
                                    typeof data.funnel?._count?.contacts === "number"
                                      ? data.funnel._count.contacts
                                      : contactTotal,
                                  allContacts: true,
                                });
                                setAssignMessage(
                                  `Added ${data.assigned ?? contactTotal} contact${
                                    (data.assigned ?? contactTotal) === 1 ? "" : "s"
                                  } to this funnel.`,
                                );
                                setSelectedIds([]);
                                router.refresh();
                              });
                            }}
                          >
                            Add all CRM contacts
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={pending || selectedIds.length === 0}
                            onClick={() => {
                              setAssignMessage(null);
                              startTransition(async () => {
                                const res = await fetch(`/api/growth/funnels/${funnel.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ contactIds: selectedIds }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  setAssignMessage(data.error ?? "Could not assign contacts.");
                                  return;
                                }
                                applyAssignment({
                                  funnelId: funnel.id,
                                  assignedIds: selectedIds,
                                  assignedCount:
                                    typeof data.funnel?._count?.contacts === "number"
                                      ? data.funnel._count.contacts
                                      : inThisFunnel.length + selectedIds.length,
                                });
                                setAssignMessage(
                                  `Added ${data.assigned ?? selectedIds.length} contact${
                                    (data.assigned ?? selectedIds.length) === 1 ? "" : "s"
                                  }.`,
                                );
                                setSelectedIds([]);
                                router.refresh();
                              });
                            }}
                          >
                            Add selected
                          </Button>
                        </div>
                        {assignMessage ? (
                          <p className="text-sm text-forest">{assignMessage}</p>
                        ) : null}
                        {available.length === 0 ? (
                          <p className="text-sm text-fix-text-muted">
                            Import buyers in CRM first if this list is empty.
                          </p>
                        ) : (
                          <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-fix-border/15 p-2">
                            {available.map((contact) => {
                              const checked = selectedIds.includes(contact.id);
                              return (
                                <li key={contact.id}>
                                  <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-fix-bg-muted">
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      checked={checked}
                                      onChange={() => {
                                        setSelectedIds((prev) =>
                                          checked
                                            ? prev.filter((id) => id !== contact.id)
                                            : [...prev, contact.id],
                                        );
                                      }}
                                    />
                                    <span className="min-w-0">
                                      <span className="block text-sm font-medium text-fix-heading">
                                        {contact.name}
                                      </span>
                                      <span className="block text-xs text-fix-text-muted">
                                        {contact.email}
                                        {contact.funnelId
                                          ? " · currently in another funnel"
                                          : " · not in a funnel yet"}
                                      </span>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                </FunnelPreviewCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
