"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GrowthKpiCard } from "@/components/growth/GrowthKpiCard";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { formatPercent, formatRevenue } from "@/lib/growth/campaignFormat";
import type { CampaignAnalytics } from "@/lib/growth/campaignAnalyticsTypes";
import {
  GROWTH_CAMPAIGN_OBJECTIVE_LABELS,
  GROWTH_CAMPAIGN_RECIPIENT_STATUS,
  GROWTH_CAMPAIGN_STATUS,
  GROWTH_CAMPAIGN_STATUS_LABELS,
  GROWTH_MARKETING_EVENT_TYPE,
  type GrowthCampaignObjective,
  type GrowthCampaignStatus,
} from "@/lib/growth/roles";

type Activity = {
  id: string;
  eventType: string;
  occurredAt: string;
  contact: { id: string; name: string } | null;
};

type RecipientRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
  attributedRevenueCents: number;
  contactId: string | null;
  marketingOptIn: boolean | null;
};

function eventLabel(type: string) {
  switch (type) {
    case GROWTH_MARKETING_EVENT_TYPE.EMAIL_SENT:
      return "Campaign sent";
    case GROWTH_MARKETING_EVENT_TYPE.EMAIL_OPEN:
      return "Opened campaign";
    case GROWTH_MARKETING_EVENT_TYPE.EMAIL_CLICK:
      return "Clicked campaign";
    case GROWTH_MARKETING_EVENT_TYPE.DESTINATION_VISIT:
      return "Visited destination";
    case GROWTH_MARKETING_EVENT_TYPE.CHECKOUT_STARTED:
      return "Started checkout";
    case GROWTH_MARKETING_EVENT_TYPE.CONVERSION:
      return "Converted";
    case GROWTH_MARKETING_EVENT_TYPE.UNSUBSCRIBED:
      return "Unsubscribed";
    default:
      return type;
  }
}

function recipientStatusLabel(status: string) {
  if (status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.SENT) return "Sent";
  if (status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.FAILED) return "Failed";
  if (status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.SKIPPED) return "Skipped";
  if (status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.QUEUED) return "Queued";
  return status;
}

export function GrowthCampaignResults({
  campaign,
  analytics,
  activity,
  series,
  recipients,
  destinationLabel,
  audienceSummary,
}: {
  campaign: {
    id: string;
    name: string;
    status: string;
    objective: string | null;
    sentAt: string | null;
    destinationUrl: string | null;
  };
  analytics: CampaignAnalytics;
  activity: Activity[];
  series: Array<{ date: string; clicks: number; conversions: number }>;
  recipients: RecipientRow[];
  destinationLabel: string;
  audienceSummary: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const funnel = [
    { label: "Sent", value: analytics.recipients },
    { label: "Delivered", value: analytics.delivered },
    { label: "Opened", value: analytics.uniqueOpens },
    { label: "Clicked", value: analytics.uniqueClicks },
    { label: "Destination visit", value: analytics.destinationVisits },
    { label: "Converted", value: analytics.conversions },
  ];

  const canPause =
    campaign.status === GROWTH_CAMPAIGN_STATUS.SCHEDULED ||
    campaign.status === GROWTH_CAMPAIGN_STATUS.SENDING;
  const canResume = campaign.status === GROWTH_CAMPAIGN_STATUS.PAUSED;
  const canCancel =
    campaign.status !== GROWTH_CAMPAIGN_STATUS.SENT &&
    campaign.status !== GROWTH_CAMPAIGN_STATUS.CANCELLED;

  function runAction(action: "pause" | "resume" | "cancel") {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/growth/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update campaign");
        return;
      }
      setMessage(
        action === "pause"
          ? "Campaign paused."
          : action === "resume"
            ? "Campaign resumed."
            : "Campaign cancelled.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fix-heading">{campaign.name}</h1>
          <p className="text-sm text-fix-text-muted">
            {GROWTH_CAMPAIGN_STATUS_LABELS[campaign.status as GrowthCampaignStatus] ?? campaign.status}
            {" · "}
            {GROWTH_CAMPAIGN_OBJECTIVE_LABELS[campaign.objective as GrowthCampaignObjective] ?? "Custom"}
            {campaign.sentAt ? ` · ${new Date(campaign.sentAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPause ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => runAction("pause")}
            >
              Pause
            </Button>
          ) : null}
          {canResume ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => runAction("resume")}
            >
              Resume
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Cancel this campaign? It will not send.")) {
                  runAction("cancel");
                }
              }}
            >
              Cancel campaign
            </Button>
          ) : null}
          <ButtonLink href={`/account/growth/campaigns/${campaign.id}`} variant="secondary" size="sm">
            Campaign
          </ButtonLink>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-fix-text">{message}</p> : null}
      {campaign.status === GROWTH_CAMPAIGN_STATUS.SENT ? (
        <p className="text-sm text-fix-text-muted">
          This campaign already sent. Emails that went out cannot be recalled — use the recipient
          list below to see exactly who received it.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <GrowthKpiCard label="Recipients" value={String(analytics.recipients)} />
        <GrowthKpiCard label="Open rate" value={formatPercent(analytics.openRate)} />
        <GrowthKpiCard label="Click rate" value={formatPercent(analytics.clickRate)} />
        <GrowthKpiCard label="Conversions" value={String(analytics.conversions)} />
        <GrowthKpiCard label="Revenue" value={formatRevenue(analytics.revenueCents)} />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-fix-heading">Funnel</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {funnel.map((row, index) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-fix-text-muted">
                {row.label}
                {index < funnel.length - 1 ? " ↓" : ""}
              </span>
              <span className="font-medium text-fix-heading">{row.value}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-semibold text-fix-heading">Audience</h2>
          <p className="text-sm text-fix-text-muted">{audienceSummary}</p>
        </Card>
        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-semibold text-fix-heading">Destination</h2>
          <p className="text-sm text-fix-heading">{destinationLabel}</p>
          {campaign.destinationUrl ? (
            <Link href={campaign.destinationUrl} className="text-sm text-fix-link">
              View destination
            </Link>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-fix-heading">Who received this</h2>
            <p className="text-xs text-fix-text-muted">
              {recipients.length} recipient{recipients.length === 1 ? "" : "s"} on record
              {analytics.failed ? ` · ${analytics.failed} failed` : ""}
            </p>
          </div>
        </div>
        {recipients.length === 0 ? (
          <p className="text-sm text-fix-text-muted">No recipients recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-fix-border/20 text-xs text-fix-text-muted">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Sent</th>
                  <th className="py-2 pr-3 font-medium">Opened</th>
                  <th className="py-2 pr-3 font-medium">Clicked</th>
                  <th className="py-2 font-medium">Converted</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((row) => (
                  <tr key={row.id} className="border-b border-fix-border/10">
                    <td className="py-2 pr-3 text-fix-heading">
                      {row.contactId ? (
                        <Link href={`/account/growth/crm/${row.contactId}`} className="text-fix-link">
                          {row.name || "—"}
                        </Link>
                      ) : (
                        row.name || "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 text-fix-text-muted">{row.email}</td>
                    <td className="py-2 pr-3 text-fix-heading">{recipientStatusLabel(row.status)}</td>
                    <td className="py-2 pr-3 text-fix-text-muted">
                      {row.sentAt ? new Date(row.sentAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-3 text-fix-text-muted">{row.openedAt ? "Yes" : "—"}</td>
                    <td className="py-2 pr-3 text-fix-text-muted">{row.clickedAt ? "Yes" : "—"}</td>
                    <td className="py-2 text-fix-text-muted">
                      {row.convertedAt
                        ? row.attributedRevenueCents
                          ? formatRevenue(row.attributedRevenueCents)
                          : "Yes"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-fix-heading">Performance over time</h2>
        <p className="text-xs text-fix-text-muted">Clicks</p>
        <GrowthSparkline values={series.map((row) => row.clicks)} />
        <p className="text-xs text-fix-text-muted">Conversions</p>
        <GrowthSparkline values={series.map((row) => row.conversions)} strokeClassName="stroke-amber" />
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-fix-heading">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-fix-text-muted">No engagement yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activity.map((item) => (
              <li key={item.id}>
                <span className="text-fix-heading">{eventLabel(item.eventType)}</span>
                {item.contact ? (
                  <>
                    {" · "}
                    <Link href={`/account/growth/crm/${item.contact.id}`} className="text-fix-link">
                      {item.contact.name}
                    </Link>
                  </>
                ) : null}
                <span className="text-fix-text-muted">
                  {" · "}
                  {new Date(item.occurredAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
