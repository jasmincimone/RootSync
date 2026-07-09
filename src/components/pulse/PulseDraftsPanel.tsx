"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PulseDraftSummary } from "@/components/CommunityPostForm";
import { PulsePostContent } from "@/components/pulse/PulsePostContent";
import {
  PulsePostFeedback,
  pulsePostErrorFromResponse,
} from "@/components/pulse/PulsePostFeedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCommunityDateTime } from "@/lib/formatCommunityDate";
import { pulsePostPlainText } from "@/lib/pulsePostHtml";
import type { PulsePostApiError } from "@/lib/pulsePostValidation";

type Props = {
  drafts: PulseDraftSummary[];
  activeDraftId?: string | null;
  onContinue: (draft: PulseDraftSummary) => void;
  onDraftsChange?: () => void;
};

function draftPreview(content: string): string {
  const text = pulsePostPlainText(content);
  if (text) return text.length > 140 ? `${text.slice(0, 137).trim()}…` : text;
  if (/<img[\s>]/i.test(content)) return "Draft with image";
  if (/<video[\s>]/i.test(content)) return "Draft with video";
  if (/data-pulse-file/i.test(content)) return "Draft with file";
  return "Empty draft";
}

export function PulseDraftsPanel({
  drafts,
  activeDraftId,
  onContinue,
  onDraftsChange,
}: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<PulsePostApiError | null>(null);

  if (drafts.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-fix-heading">Drafts</h2>
        <p className="mt-2 text-xs text-fix-text-muted">
          Save work in progress with <span className="font-medium">Save draft</span> above. Drafts stay
          private until you publish.
        </p>
        <EmptyState
          bordered={false}
          className="mt-4"
          title="No drafts yet"
          description="Start writing a Pulse and save a draft anytime."
        />
      </Card>
    );
  }

  async function removeDraft(id: string) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(pulsePostErrorFromResponse(data, "Could not delete draft."));
        return;
      }
      onDraftsChange?.();
      router.refresh();
    } catch {
      setError({
        error: "Could not delete draft.",
        hint: "Check your connection and try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-fix-heading">Drafts</h2>
      <p className="mt-2 text-xs text-fix-text-muted">
        Pick up where you left off. Drafts are only visible to you until published.
      </p>
      <PulsePostFeedback error={error} className="mt-3" />
      <ul className="mt-4 space-y-3">
        {drafts.map((draft) => {
          const isActive = draft.id === activeDraftId;
          return (
            <li key={draft.id}>
              <div
                className={`rounded-xl border p-4 ${
                  isActive
                    ? "border-amber/40 bg-amber/5"
                    : "border-fix-border/15 bg-fix-bg-muted/20"
                }`}
              >
                <p className="text-xs text-fix-text-muted">
                  Updated {formatCommunityDateTime(draft.updatedAt)}
                  {isActive ? " · Editing now" : ""}
                </p>
                <p className="mt-2 text-sm text-fix-heading">{draftPreview(draft.content)}</p>
                <div className="mt-2 max-h-24 overflow-hidden rounded-lg border border-fix-border/10 bg-fix-surface/80 p-2">
                  <PulsePostContent html={draft.content} className="mt-0 text-xs" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? "secondary" : "cta"}
                    onClick={() => onContinue(draft)}
                  >
                    {isActive ? "Continue editing" : "Open draft"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={deletingId === draft.id}
                    onClick={() => void removeDraft(draft.id)}
                  >
                    {deletingId === draft.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
