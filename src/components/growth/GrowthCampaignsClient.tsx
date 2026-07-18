"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export type GrowthCampaignRow = {
  id: string;
  name: string;
  subject: string | null;
  bodyHtml: string | null;
  status: string;
  sentAt: string | null;
  updatedAt: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

export function GrowthCampaignsClient({
  initialCampaigns,
}: {
  initialCampaigns: GrowthCampaignRow[];
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-fix-heading">Draft campaign</h2>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Internal name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Subject</label>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-fix-text-muted">Body (HTML or plain text)</label>
          <textarea
            className={inputClass + " min-h-[120px] font-mono text-xs"}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="<p>Hello from our community…</p>"
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-fix-text">{message}</p> : null}
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const res = await fetch("/api/growth/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, subject, bodyHtml }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.error ?? "Could not create campaign");
                return;
              }
              const c = data.campaign;
              setCampaigns((prev) => [
                {
                  id: c.id,
                  name: c.name,
                  subject: c.subject,
                  bodyHtml: c.bodyHtml,
                  status: c.status,
                  sentAt: c.sentAt,
                  updatedAt: c.updatedAt,
                },
                ...prev,
              ]);
              setName("");
              setSubject("");
              setBodyHtml("");
              setMessage("Draft saved.");
              router.refresh();
            });
          }}
        >
          Save draft
        </Button>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No campaigns yet"
          description="Draft an email campaign and send it to your CRM contacts."
        />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Card className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-fix-heading">{campaign.name}</h3>
                    <p className="text-sm text-fix-text-muted">
                      {campaign.subject || "No subject"} · {campaign.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {campaign.status !== "SENT" ? (
                      <Button
                        type="button"
                        variant="cta"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setMessage(null);
                          startTransition(async () => {
                            const res = await fetch(`/api/growth/campaigns/${campaign.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "send" }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              setError(data.error ?? "Send failed");
                              return;
                            }
                            setMessage(`Sent to ${data.sentCount} contacts.`);
                            setCampaigns((prev) =>
                              prev.map((c) =>
                                c.id === campaign.id
                                  ? { ...c, status: "SENT", sentAt: new Date().toISOString() }
                                  : c,
                              ),
                            );
                            router.refresh();
                          });
                        }}
                      >
                        Send to CRM
                      </Button>
                    ) : null}
                    {campaign.status !== "SENT" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const res = await fetch(`/api/growth/campaigns/${campaign.id}`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
                              router.refresh();
                            }
                          });
                        }}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
