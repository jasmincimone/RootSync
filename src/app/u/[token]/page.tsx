import { PageBody } from "@/components/ui/PageBody";
import { Card } from "@/components/ui/Card";
import { unsubscribeCampaignRecipient } from "@/lib/growth/campaignTracking";

export const dynamic = "force-dynamic";

export default async function CampaignUnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await unsubscribeCampaignRecipient(token);

  return (
    <PageBody description="Email preferences">
      <Card className="space-y-2 p-6">
        <h1 className="text-lg font-semibold text-fix-heading">
          {result ? "You’re unsubscribed" : "Link not found"}
        </h1>
        <p className="text-sm text-fix-text-muted">
          {result
            ? `You will no longer receive marketing emails like “${result.campaignName}” from this business.`
            : "This unsubscribe link is invalid or expired."}
        </p>
      </Card>
    </PageBody>
  );
}
