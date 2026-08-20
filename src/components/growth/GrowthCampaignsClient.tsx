"use client";

import { useMemo, useState } from "react";
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

function bucket(status: string): "draft" | "scheduled" | "sent" | "completed" | "paused" {
  if (status === GROWTH_CAMPAIGN_STATUS.DRAFT) return "draft";
  if (status === GROWTH_CAMPAIGN_STATUS.SCHEDULED) return "scheduled";
  if (status === GROWTH_CAMPAIGN_STATUS.SENDING) return "sent";
  if (status === GROWTH_CAMPAIGN_STATUS.SENT) return "completed";
  if (status === GROWTH_CAMPAIGN_STATUS.PAUSED) return "paused";
  return "draft";
}

const inputClass =
  "rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

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
    completed: filtered.filter((row) => bucket(row.status) === "completed"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fix-heading">Campaigns</h1>
          <p className="text-sm text-fix-text-muted">
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

          <Section title="Draft campaigns" rows={grouped.draft} />
          <Section title="Scheduled campaigns" rows={grouped.scheduled} />
          <Section title="Active / sending" rows={grouped.sent} />
          <Section title="Completed campaigns" rows={grouped.completed} />
        </>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: GrowthCampaignDashboardRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-fix-heading">{title}</h2>
      <ul className="space-y-3">
        {rows.map((campaign) => (
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
                    className="font-semibold text-fix-heading hover:text-fix-link"
                  >
                    {campaign.name}
                  </Link>
                  <p className="mt-1 text-sm text-fix-text-muted">
                    {objectiveLabel(campaign.objective)} · {campaign.channel} ·{" "}
                    {destinationLabel(campaign)}
                  </p>
                </div>
                <StatusBadge label={statusLabel(campaign.status)} tone={statusTone(campaign.status)} />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-fix-text-muted sm:grid-cols-4 lg:grid-cols-8">
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
                {campaign.status === GROWTH_CAMPAIGN_STATUS.SENT ? (
                  <ButtonLink
                    href={`/account/growth/campaigns/${campaign.id}/results`}
                    variant="ghost"
                    size="sm"
                  >
                    Results
                  </ButtonLink>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="font-medium text-fix-heading">{value}</dd>
    </div>
  );
}
