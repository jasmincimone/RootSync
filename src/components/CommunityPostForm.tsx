"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { PulseRichTextEditor } from "@/components/pulse/PulseRichTextEditor";
import {
  PulsePostFeedback,
  pulsePostErrorFromResponse,
} from "@/components/pulse/PulsePostFeedback";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePulseToast } from "@/components/pulse/PulseToastProvider";
import { pulsePostHasVisibleContent } from "@/lib/pulsePostHtml";
import type { PulseEarnedPayload } from "@/lib/pulse/toastMessages";
import type { PulsePostApiError } from "@/lib/pulsePostValidation";

export type PulseDraftSummary = {
  id: string;
  content: string;
  updatedAt: string;
};

type Props = {
  initialDraftId?: string | null;
  initialDrafts?: PulseDraftSummary[];
  onDraftsChange?: () => void;
  onPublished?: () => void;
};

export function CommunityPostForm({
  initialDraftId = null,
  initialDrafts = [],
  onDraftsChange,
  onPublished,
}: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showPulseEarned } = usePulseToast();
  const [content, setContent] = useState("");
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [error, setError] = useState<PulsePostApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<"publish" | "draft" | null>(null);

  const loadDraft = useCallback((draft: PulseDraftSummary) => {
    setDraftId(draft.id);
    setContent(draft.content);
    setError(null);
    setSuccess(null);
  }, []);

  useEffect(() => {
    if (!initialDraftId) return;
    const draft = initialDrafts.find((d) => d.id === initialDraftId);
    if (draft) loadDraft(draft);
  }, [initialDraftId, initialDrafts, loadDraft]);

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return (
      <Card className="p-5">
        <p className="text-sm text-fix-text-muted">Sign in to create a Pulse.</p>
        <div className="mt-3">
          <ButtonLink href="/login?callbackUrl=/pulse" variant="cta" size="sm">
            Sign in
          </ButtonLink>
        </div>
      </Card>
    );
  }

  async function savePost(mode: "publish" | "draft") {
    if (mode === "publish" && !pulsePostHasVisibleContent(content)) {
      setError({
        error: "Write something or add a photo, video, or file.",
        hint: "Type in the editor or attach media before publishing.",
        code: "EMPTY",
      });
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);
    setSavingMode(mode);

    try {
      const isDraft = mode === "draft";
      const endpoint = draftId
        ? `/api/community/posts/${encodeURIComponent(draftId)}`
        : "/api/community/posts";
      const method = draftId ? "PATCH" : "POST";
      const body = draftId
        ? { content, ...(isDraft ? { draft: true } : { publish: true }) }
        : { content, ...(isDraft ? { draft: true } : {}) };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        code?: string;
        details?: string[];
        pulseEarned?: PulseEarnedPayload | null;
        post?: { id: string };
        savedAs?: string;
      };

      if (!res.ok) {
        setError(pulsePostErrorFromResponse(data, "Failed to save your Pulse"));
        return;
      }

      if (data.pulseEarned) {
        showPulseEarned(data.pulseEarned);
      }

      if (isDraft) {
        if (data.post?.id) setDraftId(data.post.id);
        setSuccess("Draft saved.");
        onDraftsChange?.();
      } else {
        setContent("");
        setDraftId(null);
        setSuccess("Pulse published.");
        onDraftsChange?.();
        onPublished?.();
      }
      router.refresh();
    } catch {
      setError({
        error: "Could not reach the server.",
        hint: "Check your internet connection and try again.",
        code: "SERVER_ERROR",
      });
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  }

  function startFresh() {
    setDraftId(null);
    setContent("");
    setError(null);
    setSuccess(null);
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-fix-heading">
            {draftId ? "Edit draft" : "Create Pulse"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-fix-text-muted">
            Build your Pulse with text, photos, and videos in one place — add titles, captions, and
            context wherever you want.
          </p>
        </div>
        {draftId ? (
          <button
            type="button"
            onClick={startFresh}
            className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
          >
            Start new Pulse
          </button>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void savePost("publish");
        }}
        className="mt-4 space-y-4"
      >
        <PulsePostFeedback success={success} error={error} />
        <PulseRichTextEditor
          value={content}
          onChange={(html) => {
            setContent(html);
            setSuccess(null);
            setError(null);
          }}
          disabled={saving}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={saving}
            size="sm"
            variant="cta"
          >
            {saving && savingMode === "publish" ? "Publishing…" : "Publish Pulse"}
          </Button>
          <Button
            type="button"
            disabled={saving}
            size="sm"
            variant="secondary"
            onClick={() => void savePost("draft")}
          >
            {saving && savingMode === "draft" ? "Saving…" : draftId ? "Update draft" : "Save draft"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
