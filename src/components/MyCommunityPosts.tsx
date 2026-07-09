"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PulsePostContent } from "@/components/pulse/PulsePostContent";
import { PulseRichTextEditor } from "@/components/pulse/PulseRichTextEditor";
import { PulsePostMediaGallery } from "@/components/pulse/PulsePostMediaGallery";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PulsePostFeedback, pulsePostErrorFromResponse } from "@/components/pulse/PulsePostFeedback";
import type { PulsePostMediaItem } from "@/config/pulsePostMedia";
import { formatCommunityDate, formatCommunityDateTime } from "@/lib/formatCommunityDate";
import { isPulseHtmlContent, plainTextToPulseHtml, pulsePostHasVisibleContent } from "@/lib/pulsePostHtml";
import type { PulsePostApiError } from "@/lib/pulsePostValidation";

export type SerializedCommunityPost = {
  id: string;
  content: string;
  media: PulsePostMediaItem[];
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
};

type Props = {
  posts: SerializedCommunityPost[];
};

function toEditorHtml(content: string): string {
  return isPulseHtmlContent(content) ? content : content ? plainTextToPulseHtml(content) : "";
}

export function MyCommunityPosts({ posts: initialPosts }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<PulsePostApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function startEdit(p: SerializedCommunityPost) {
    setEditingId(p.id);
    setDraft(toEditorHtml(p.content));
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setError(null);
    setSuccess(null);
  }

  async function saveEdit(postId: string) {
    if (!pulsePostHasVisibleContent(draft)) {
      setError({
        error: "Add text or at least one attachment.",
        hint: "Your post needs visible text, a photo, a video, or a file.",
      });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(pulsePostErrorFromResponse(data, "Could not save."));
        setSaving(false);
        return;
      }
      const post = data.post as {
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        editedAt: string | null;
      };
      setPosts((prev) => {
        const next = prev.map((row) =>
          row.id === post.id
            ? {
                id: post.id,
                content: post.content,
                media: [],
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                editedAt: post.editedAt,
              }
            : row
        );
        return [...next].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
      setEditingId(null);
      setDraft("");
      setSuccess("Saved.");
      window.setTimeout(() => setSuccess(null), 5000);
      router.refresh();
    } catch {
      setError({
        error: "Something went wrong.",
        hint: "Check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(postId: string) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeletingId(postId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(pulsePostErrorFromResponse(data, "Could not delete."));
        setDeletingId(null);
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSuccess("Deleted.");
      window.setTimeout(() => setSuccess(null), 5000);
      if (editingId === postId) cancelEdit();
      router.refresh();
    } catch {
      setError({
        error: "Something went wrong.",
        hint: "Check your connection and try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (posts.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-fix-text-muted">
          You haven&apos;t posted on Pulse yet.{" "}
          <a href="/pulse" className="font-medium text-fix-link hover:text-fix-link-hover">
            Start a Pulse
          </a>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <PulsePostFeedback success={success} error={error} />
      <ul className="space-y-4">
        {posts.map((p) => {
          const html = toEditorHtml(p.content);
          const showLegacyGallery = !isPulseHtmlContent(p.content) && p.media.length > 0;
          return (
            <li key={p.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-xs text-fix-text-muted">
                    <span>Posted {formatCommunityDate(p.createdAt)}</span>
                    {p.editedAt ? (
                      <>
                        <span className="mx-1.5">·</span>
                        <span className="text-fix-text-muted">
                          Edited {formatCommunityDateTime(p.editedAt)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {editingId !== p.id ? (
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-bark hover:bg-bark/10"
                        disabled={deletingId === p.id}
                        onClick={() => remove(p.id)}
                      >
                        {deletingId === p.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {editingId === p.id ? (
                  <div className="mt-3 space-y-3">
                    <PulseRichTextEditor value={draft} onChange={setDraft} disabled={saving} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="cta"
                        size="sm"
                        disabled={saving}
                        onClick={() => saveEdit(p.id)}
                      >
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <PulsePostContent html={html} />
                    {showLegacyGallery ? <PulsePostMediaGallery media={p.media} /> : null}
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
