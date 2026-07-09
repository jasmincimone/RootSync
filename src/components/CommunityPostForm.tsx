"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { usePulseToast } from "@/components/pulse/PulseToastProvider";
import type { PulseEarnedPayload } from "@/lib/pulse/toastMessages";

export function CommunityPostForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showPulseEarned } = usePulseToast();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        pulseEarned?: PulseEarnedPayload | null;
      };
      if (!res.ok) {
        setError(data.error || "Failed to post");
        setSaving(false);
        return;
      }
      if (data.pulseEarned) {
        showPulseEarned(data.pulseEarned);
      }
      setContent("");
      setSuccess("Pulse published.");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-fix-heading">Create Pulse</h2>
      <p className="mt-2 text-xs leading-relaxed text-fix-text-muted">
        Pulses are public on the feed. Share a harvest, question, event, or community win — meaningful
        contributions strengthen the ecosystem.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <FormFeedback success={success} error={error} />
        <textarea
          required
          rows={4}
          maxLength={8000}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSuccess(null);
            setError(null);
          }}
          placeholder="Share an update, question, or win…"
          className="w-full rounded-xl border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text placeholder:text-fix-text-muted/70"
        />
        <Button type="submit" disabled={saving} size="sm" variant="cta">
          {saving ? "Publishing…" : "Publish Pulse"}
        </Button>
      </form>
    </Card>
  );
}
