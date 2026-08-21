"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPercent, formatRevenue } from "@/lib/growth/campaignFormat";
import {
  GROWTH_CAMPAIGN_OBJECTIVE_LABELS,
  GROWTH_CAMPAIGN_STATUS,
  GROWTH_CAMPAIGN_STATUS_LABELS,
  type GrowthCampaignObjective,
  type GrowthCampaignStatus,
} from "@/lib/growth/roles";

export type GrowthCampaignDashboardRow = {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  channel: string;
  destinationType: string | null;
  destinationUrl: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  destinationVisitCount: number;
  conversionCount: number;
  revenueCents: number;
};

function statusTone(status: string): "success" | "warning" | "neutral" | "danger" {
  if (status === GROWTH_CAMPAIGN_STATUS.SENT) return "success";
  if (status === GROWTH_CAMPAIGN_STATUS.SCHEDULED || status === GROWTH_CAMPAIGN_STATUS.SENDING) {
    return "warning";
  }
  if (status === GROWTH_CAMPAIGN_STATUS.CANCELLED) return "danger";
  return "neutral";
}

function statusLabel(status: string) {
  return GROWTH_CAMPAIGN_STATUS_LABELS[status as GrowthCampaignStatus] ?? status;
}

function objectiveLabel(objective: string | null) {
  if (!objective) return "Custom";
  return GROWTH_CAMPAIGN_OBJECTIVE_LABELS[objective as GrowthCampaignObjective] ?? objective;
}

function destinationLabel(row: GrowthCampaignDashboardRow) {
  if (row.destinationType === "FUNNEL") return "Funnel";
  if (row.destinationType === "LISTING") return "Listing";
  if (row.destinationType === "BOOKING") return "Booking";
  if (row.destinationType === "EXTERNAL") return "External URL";
  return "Not set";
}

function bucket(
  status: string,
): "draft" | "scheduled" | "sent" | "completed" | "paused" | "cancelled" {
  if (status === GROWTH_CAMPAIGN_STATUS.DRAFT) return "draft";
  if (status === GROWTH_CAMPAIGN_STATUS.SCHEDULED) return "scheduled";
  if (status === GROWTH_CAMPAIGN_STATUS.SENDING) return "sent";
  if (status === GROWTH_CAMPAIGN_STATUS.SENT) return "completed";
  if (status === GROWTH_CAMPAIGN_STATUS.PAUSED) return "paused";
  if (status === GROWTH_CAMPAIGN_STATUS.CANCELLED) return "cancelled";
  return "draft";
}

const inputClass =
  "rounded-lg border border-rs-border/25 bg-rs-surface px-3 py-2 text-sm text-rs-heading";

export function GrowthCampaignsClient({
  initialCampaigns,
}: {
  initialCampaigns: GrowthCampaignDashboardRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [objective, setObjective] = useState("ALL");
  const [channel, setChannel] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialCampaigns.filter((campaign) => {
      if (needle && !campaign.name.toLowerCase().includes(needle)) return false;
      if (status !== "ALL") {
        if (status === "COMPLETED") {
          if (campaign.status !== GROWTH_CAMPAIGN_STATUS.SENT) return false;
        } else if (campaign.status !== status) {
          return false;
        }
      }
      if (objective !== "ALL" && campaign.objective !== objective) return false;
      if (channel !== "ALL" && campaign.channel !== channel) return false;
      if (fromDate) {
        const stamp = campaign.sentAt || campaign.scheduledAt;
        if (!stamp || stamp.slice(0, 10) < fromDate) return false;
      }
      return true;
    });
  }, [channel, fromDate, initialCampaigns, objective, query, status]);

  const grouped = {
    draft: filtered.filter((row) => bucket(row.status) === "draft"),
    scheduled: filtered.filter((row) => bucket(row.status) === "scheduled"),
    sent: filtered.filter((row) => bucket(row.status) === "sent"),
    paused: filtered.filter((row) => bucket(row.status) === "paused"),
    completed: filtered.filter((row) => bucket(row.status) === "completed"),
    cancelled: filtered.filter((row) => bucket(row.status) === "cancelled"),
  };

  function runAction(campaignId: string, action: "pause" | "resume" | "cancel") {
    setActionError(null);
    setPendingId(campaignId);
    startTransition(async () => {
      const res = await fetch(`/api/growth/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      setPendingId(null);
      if (!res.ok) {
        setActionError(data.error ?? "Could not update campaign");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-rs-heading">Campaigns</h1>
          <p className="text-sm text-rs-text-muted">
            Who you reach, what you send, where they go, and what converted.
          </p>
        </div>
        <Button
          type="button"
          variant="cta"
          size="sm"
          onClick={() => router.push("/account/growth/campaigns/new")}
        >
          New campaign
        </Button>
      </div>

      {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}

      {initialCampaigns.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Turn contacts into customers."
          description="Create targeted campaigns, send people directly into your RootSync funnels, and see what actually converts."
          action={{ href: "/account/growth/campaigns/new", label: "Create Your First Campaign" }}
        />
      ) : (
        <>
          <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className={inputClass}
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All statuses</option>
              {Object.entries(GROWTH_CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="COMPLETED">Completed</option>
            </select>
            <select
              className={inputClass}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            >
              <option value="ALL">All objectives</option>
              {Object.entries(GROWTH_CAMPAIGN_OBJECTIVE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                className={inputClass + " flex-1"}
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="ALL">All channels</option>
                <option value="EMAIL">Email</option>
              </select>
              <input
                type="date"
                className={inputClass}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
              />
            </div>
          </Card>

          <Section
            title="Draft campaigns"
            rows={grouped.draft}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
          <Section
            title="Scheduled campaigns"
            rows={grouped.scheduled}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
          <Section
            title="Paused campaigns"
            rows={grouped.paused}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
          <Section
            title="Active / sending"
            rows={grouped.sent}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
          <Section
            title="Completed campaigns"
            rows={grouped.completed}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
          <Section
            title="Cancelled campaigns"
            rows={grouped.cancelled}
            pending={pending}
            pendingId={pendingId}
            onAction={runAction}
          />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  pending,
  pendingId,
  onAction,
}: {
  title: string;
  rows: GrowthCampaignDashboardRow[];
  pending: boolean;
  pendingId: string | null;
  onAction: (id: string, action: "pause" | "resume" | "cancel") => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-rs-heading">{title}</h2>
      <ul className="space-y-3">
        {rows.map((campaign) => {
          const busy = pending && pendingId === campaign.id;
          const canPause =
            campaign.status === GROWTH_CAMPAIGN_STATUS.SCHEDULED ||
            campaign.status === GROWTH_CAMPAIGN_STATUS.SENDING;
          const canResume = campaign.status === GROWTH_CAMPAIGN_STATUS.PAUSED;
          const canCancel =
            campaign.status !== GROWTH_CAMPAIGN_STATUS.SENT &&
            campaign.status !== GROWTH_CAMPAIGN_STATUS.CANCELLED;
          const showResults =
            campaign.status === GROWTH_CAMPAIGN_STATUS.SENT ||
            campaign.status === GROWTH_CAMPAIGN_STATUS.SENDING ||
            campaign.recipientCount > 0;

          return (
            <li key={campaign.id}>
              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={
                        campaign.status === GROWTH_CAMPAIGN_STATUS.SENT
                          ? `/account/growth/campaigns/${campaign.id}/results`
                          : `/account/growth/campaigns/${campaign.id}`
                      }
                      className="font-semibold text-rs-heading hover:text-rs-link"
                    >
                      {campaign.name}
                    </Link>
                    <p className="mt-1 text-sm text-rs-text-muted">
                      {objectiveLabel(campaign.objective)} · {campaign.channel} ·{" "}
                      {destinationLabel(campaign)}
                    </p>
                  </div>
                  <StatusBadge label={statusLabel(campaign.status)} tone={statusTone(campaign.status)} />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs text-rs-text-muted sm:grid-cols-4 lg:grid-cols-8">
                  <Metric label="Audience" value={String(campaign.recipientCount)} />
                  <Metric
                    label="Send date"
                    value={
                      campaign.sentAt || campaign.scheduledAt
                        ? new Date(campaign.sentAt || campaign.scheduledAt || "").toLocaleDateString()
                        : "—"
                    }
                  />
                  <Metric label="Opens" value={String(campaign.openCount)} />
                  <Metric label="Clicks" value={String(campaign.clickCount)} />
                  <Metric label="Funnel visits" value={String(campaign.destinationVisitCount)} />
                  <Metric label="Conversions" value={String(campaign.conversionCount)} />
                  <Metric
                    label="Open rate"
                    value={formatPercent(
                      campaign.recipientCount ? campaign.openCount / campaign.recipientCount : 0,
                    )}
                  />
                  <Metric label="Revenue" value={formatRevenue(campaign.revenueCents)} />
                </dl>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink
                    href={`/account/growth/campaigns/${campaign.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Open
                  </ButtonLink>
                  {showResults ? (
                    <ButtonLink
                      href={`/account/growth/campaigns/${campaign.id}/results`}
                      variant="ghost"
                      size="sm"
                    >
                      Results & recipients
                    </ButtonLink>
                  ) : null}
                  {canPause ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => onAction(campaign.id, "pause")}
                    >
                      {busy ? "…" : "Pause"}
                    </Button>
                  ) : null}
                  {canResume ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => onAction(campaign.id, "resume")}
                    >
                      {busy ? "…" : "Resume"}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Cancel this campaign? It will not send.")) {
                          onAction(campaign.id, "cancel");
                        }
                      }}
                    >
                      {busy ? "…" : "Cancel"}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="font-medium text-rs-heading">{value}</dd>
    </div>
  );
}
