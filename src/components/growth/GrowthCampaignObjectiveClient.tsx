"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CAMPAIGN_OBJECTIVE_CARDS } from "@/lib/growth/campaignTypes";
import type { GrowthCampaignObjective } from "@/lib/growth/roles";

export function GrowthCampaignObjectiveClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(objective: GrowthCampaignObjective) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/growth/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not start campaign");
        return;
      }
      router.push(`/account/growth/campaigns/${data.campaign.id}`);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fix-heading">What are you trying to grow?</h1>
        <p className="mt-1 text-sm text-fix-text-muted">
          Choose an objective. We’ll open a calm builder next — not a blank editor.
        </p>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPAIGN_OBJECTIVE_CARDS.map((card) => (
          <Card key={card.id} className="flex flex-col p-4">
            <h2 className="font-semibold text-fix-heading">{card.title}</h2>
            <p className="mt-1 flex-1 text-sm text-fix-text-muted">{card.body}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 self-start"
              disabled={pending}
              onClick={() => choose(card.id)}
            >
              Choose
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
