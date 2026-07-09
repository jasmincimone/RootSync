"use client";

import { useRouter } from "next/navigation";

import { PulseDraftsPanel } from "@/components/pulse/PulseDraftsPanel";
import type { PulseDraftSummary } from "@/components/CommunityPostForm";

type Props = {
  drafts: PulseDraftSummary[];
};

export function AccountPulseDraftsSection({ drafts }: Props) {
  const router = useRouter();

  return (
    <PulseDraftsPanel
      drafts={drafts}
      onContinue={(draft) => router.push(`/pulse?draft=${encodeURIComponent(draft.id)}`)}
    />
  );
}
