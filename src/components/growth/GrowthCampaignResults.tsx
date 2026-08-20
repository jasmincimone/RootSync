import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GrowthKpiCard } from "@/components/growth/GrowthKpiCard";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { formatPercent, formatRevenue } from "@/lib/growth/campaignFormat";
import type { CampaignAnalytics } from "@/lib/growth/campaignAnalyticsTypes";
import {
  GROWTH_CAMPAIGN_OBJECTIVE_LABELS,
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

export function GrowthCampaignResults({
  campaign,
  analytics,
  activity,
  series,
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
  destinationLabel: string;
  audienceSummary: string;
}) {
  const funnel = [
    { label: "Sent", value: analytics.recipients },
    { label: "Delivered", value: analytics.delivered },
    { label: "Opened", value: analytics.uniqueOpens },
    { label: "Clicked", value: analytics.uniqueClicks },
    { label: "Destination visit", value: analytics.destinationVisits },
    { label: "Converted", value: analytics.conversions },
  ];

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
        <ButtonLink href={`/account/growth/campaigns/${campaign.id}`} variant="secondary" size="sm">
          Campaign
        </ButtonLink>
      </div>

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
