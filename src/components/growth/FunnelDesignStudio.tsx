"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ButtonLink } from "@/components/ui/Button";
import {
  GrowthFunnelMaker,
  type FunnelMakerDraft,
} from "@/components/growth/GrowthFunnelMaker";
import { parseFunnelPageContent } from "@/lib/growth/funnelPage";

export function FunnelDesignStudio({
  draft,
  vendorPublicSlug,
}: {
  draft: FunnelMakerDraft;
  vendorPublicSlug: string | null;
}) {
  const router = useRouter();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ButtonLink href="/account/growth/funnels" variant="ghost" size="sm" className="mb-2 -ml-2">
            ← Back to funnels
          </ButtonLink>
          <h1 className="text-lg font-semibold text-fix-heading">
            {draft.id ? draft.name || "Funnel design studio" : "New funnel design studio"}
          </h1>
          <p className="mt-1 text-sm text-fix-text-muted">
            Fullscreen canvas with live preview, mobile frame, and drag-and-drop section order.
          </p>
          {saveNotice ? <p className="mt-2 text-sm text-forest">{saveNotice}</p> : null}
        </div>
      </div>

      <GrowthFunnelMaker
        key={draft.id ?? "new"}
        draft={draft}
        vendorPublicSlug={vendorPublicSlug}
        onSaved={(funnel) => {
          setSaveNotice("Saved.");
          if (!draft.id) {
            router.replace(`/account/growth/funnels/${funnel.id}/studio`);
            return;
          }
          router.refresh();
        }}
      />
    </div>
  );
}

export function funnelDraftFromRecord(funnel: {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  ctaLabel: string | null;
  landingPage?: { slug?: string | null; contentJson?: unknown } | null;
}): FunnelMakerDraft {
  return {
    id: funnel.id,
    name: funnel.name,
    objective: funnel.objective ?? "",
    description: funnel.description ?? "",
    ctaLabel: funnel.ctaLabel ?? "Continue",
    publicSlug: funnel.landingPage?.slug ?? "",
    page: parseFunnelPageContent(funnel.landingPage?.contentJson, {
      name: funnel.name,
      objective: funnel.objective,
      description: funnel.description,
    }),
  };
}
