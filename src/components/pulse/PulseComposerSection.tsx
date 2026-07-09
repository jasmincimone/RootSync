"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import {
  CommunityPostForm,
  type PulseDraftSummary,
} from "@/components/CommunityPostForm";
import { PulseDraftsPanel } from "@/components/pulse/PulseDraftsPanel";

type Props = {
  drafts: PulseDraftSummary[];
};

export function PulseComposerSection({ drafts: initialDrafts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftFromUrl = searchParams.get("draft");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftFromUrl);
  const [draftContent, setDraftContent] = useState<PulseDraftSummary | null>(
    () => initialDrafts.find((d) => d.id === draftFromUrl) ?? null,
  );

  const refreshDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/community/posts/drafts");
      const data = (await res.json().catch(() => ({}))) as {
        drafts?: PulseDraftSummary[];
      };
      if (res.ok && Array.isArray(data.drafts)) {
        setDrafts(
          data.drafts.map((d) => ({
            id: d.id,
            content: d.content,
            updatedAt:
              typeof d.updatedAt === "string"
                ? d.updatedAt
                : new Date(d.updatedAt as unknown as string).toISOString(),
          })),
        );
      }
    } catch {
      router.refresh();
    }
  }, [router]);

  function handleContinue(draft: PulseDraftSummary) {
    setActiveDraftId(draft.id);
    setDraftContent(draft);
    const url = new URL(window.location.href);
    url.searchParams.set("draft", draft.id);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <CommunityPostForm
        key={draftContent?.id ?? "new"}
        initialDraftId={activeDraftId}
        initialDrafts={draftContent ? [draftContent, ...drafts.filter((d) => d.id !== draftContent.id)] : drafts}
        onDraftsChange={() => {
          void refreshDrafts();
          router.refresh();
        }}
        onPublished={() => {
          setActiveDraftId(null);
          setDraftContent(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("draft");
          router.replace(url.pathname + url.search, { scroll: false });
        }}
      />
      <PulseDraftsPanel
        drafts={drafts}
        activeDraftId={activeDraftId}
        onContinue={handleContinue}
        onDraftsChange={() => {
          void refreshDrafts();
          router.refresh();
        }}
      />
    </div>
  );
}
