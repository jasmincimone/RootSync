"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageCropModal } from "@/components/ImageCropModal";
import { wrapCampaignEmail } from "@/lib/growth/campaignMessage";
import { parseAudienceJson } from "@/lib/growth/campaignTypes";
import {
  GROWTH_CAMPAIGN_AUDIENCE,
  GROWTH_CAMPAIGN_DESTINATION,
  GROWTH_CAMPAIGN_OBJECTIVE_LABELS,
  GROWTH_CAMPAIGN_STATUS,
  GROWTH_CAMPAIGN_STEP_TRIGGER,
  GROWTH_CONTACT_STATUS_LABELS,
  type GrowthCampaignObjective,
} from "@/lib/growth/roles";
import { GitBranch, ImagePlus, Loader2, Trash2 } from "lucide-react";

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm text-fix-heading";

const STEPS = [
  { id: "campaign", label: "Campaign" },
  { id: "audience", label: "Audience" },
  { id: "destination", label: "Destination" },
  { id: "message", label: "Message" },
  { id: "schedule", label: "Schedule" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export type CampaignBuilderCampaign = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  subject: string | null;
  previewText: string | null;
  headline: string | null;
  bodyHtml: string | null;
  heroImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  senderName: string | null;
  replyTo: string | null;
  destinationType: string | null;
  destinationId: string | null;
  destinationUrl: string | null;
  audienceType: string;
  audienceJson: unknown;
  status: string;
  scheduledAt: string | null;
  timezone: string | null;
  steps: Array<{
    id: string;
    triggerType: string;
    delayHours: number;
    subject: string | null;
    previewText: string | null;
    bodyHtml: string | null;
    ctaLabel: string | null;
    isEnabled: boolean;
  }>;
};

type DestinationOption = {
  id: string;
  name: string;
  type: string;
  url: string;
  status?: string;
};

type ContactOption = { id: string; name: string; email: string; status: string };

const TONES = ["Friendly", "Professional", "Excited", "Educational", "Urgent", "Custom"];

export function GrowthCampaignBuilder({
  campaign: initial,
  destinations,
  contacts,
  vendor,
}: {
  campaign: CampaignBuilderCampaign;
  destinations: {
    funnels: DestinationOption[];
    listings: DestinationOption[];
    bookings: DestinationOption[];
    events: DestinationOption[];
  };
  contacts: ContactOption[];
  vendor: { displayName: string; contactEmail: string | null };
}) {
  const router = useRouter();
  const locked =
    initial.status === GROWTH_CAMPAIGN_STATUS.SENT ||
    initial.status === GROWTH_CAMPAIGN_STATUS.SENDING;
  const [step, setStep] = useState<StepId>(locked ? "review" : "campaign");
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [estimated, setEstimated] = useState<number | null>(null);
  const [contactQuery, setContactQuery] = useState("");
  const [previewMobile, setPreviewMobile] = useState(false);
  const [emphasize, setEmphasize] = useState("");
  const [tone, setTone] = useState("Friendly");
  const [scheduleMode, setScheduleMode] = useState(
    initial.scheduledAt ? "schedule" : "now",
  );
  const [scheduleLocal, setScheduleLocal] = useState(
    initial.scheduledAt ? toDatetimeLocal(initial.scheduledAt) : "",
  );
  const [confirmSend, setConfirmSend] = useState(false);
  const [testEmail, setTestEmail] = useState(vendor.contactEmail ?? "");
  const [mounted, setMounted] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const skipAutosaveRef = useRef(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const audienceJson = parseAudienceJson(draft.audienceJson);
  const selectedIds = new Set(audienceJson.contactIds ?? []);

  const patch = useCallback((partial: Partial<CampaignBuilderCampaign>) => {
    skipAutosaveRef.current = false;
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (locked || skipAutosaveRef.current) return;
    const handle = window.setTimeout(() => {
      setSaving(true);
      const parsedAudience = parseAudienceJson(draft.audienceJson);
      fetch(`/api/growth/campaigns/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          objective: draft.objective,
          subject: draft.subject,
          previewText: draft.previewText,
          headline: draft.headline,
          bodyHtml: draft.bodyHtml,
          heroImageUrl: draft.heroImageUrl,
          ctaLabel: draft.ctaLabel,
          ctaUrl: draft.ctaUrl,
          senderName: draft.senderName,
          replyTo: draft.replyTo,
          destinationType: draft.destinationType,
          destinationId: draft.destinationId,
          destinationUrl: draft.destinationUrl,
          audienceType: draft.audienceType,
          audienceJson: parsedAudience,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          steps: draft.steps.map((item) => ({
            triggerType: item.triggerType,
            delayHours: item.delayHours,
            subject: item.subject,
            previewText: item.previewText,
            bodyHtml: item.bodyHtml,
            ctaLabel: item.ctaLabel,
            isEnabled: item.isEnabled,
          })),
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) setError(data.error ?? "Could not save");
          else setError(null);
        })
        .finally(() => setSaving(false));
    }, 800);
    return () => window.clearTimeout(handle);
  }, [draft, locked]);

  useEffect(() => {
    const parsedAudience = parseAudienceJson(draft.audienceJson);
    fetch("/api/growth/campaigns/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audienceType: draft.audienceType,
        audienceJson: parsedAudience,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.estimatedRecipients === "number") {
          setEstimated(data.estimatedRecipients);
        }
      })
      .catch(() => undefined);
  }, [draft.audienceJson, draft.audienceType]);

  const destinationOptions = useMemo(() => {
    if (draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.FUNNEL) return destinations.funnels;
    if (draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.LISTING) return destinations.listings;
    if (draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.BOOKING) return destinations.bookings;
    if (draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.EVENT) return destinations.events;
    return [];
  }, [destinations, draft.destinationType]);

  const selectedDestination = destinationOptions.find((row) => row.id === draft.destinationId);
  const previewHtml = useMemo(() => {
    if (!mounted) return "";
    return wrapCampaignEmail({
      origin: window.location.origin,
      trackingToken: "preview",
      subject: draft.subject || "Subject",
      previewText: draft.previewText,
      headline: draft.headline,
      heroImageUrl: draft.heroImageUrl,
      bodyHtml: draft.bodyHtml || "<p></p>",
      ctaLabel: draft.ctaLabel || "Continue",
      clickUrl: draft.ctaUrl || draft.destinationUrl || "#",
      unsubscribeUrl: "#",
      openPixelUrl: "",
      senderName: draft.senderName || vendor.displayName,
    });
  }, [
    mounted,
    draft.subject,
    draft.previewText,
    draft.headline,
    draft.heroImageUrl,
    draft.bodyHtml,
    draft.ctaLabel,
    draft.ctaUrl,
    draft.destinationUrl,
    draft.senderName,
    vendor.displayName,
  ]);

  const filteredContacts = contacts.filter((contact) => {
    const hay = `${contact.name} ${contact.email}`.toLowerCase();
    return hay.includes(contactQuery.trim().toLowerCase());
  });

  function runAction(body: Record<string, unknown>, onOk?: () => void) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/growth/campaigns/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-fix-heading">{draft.name || "Untitled campaign"}</h1>
          <p className="text-sm text-fix-text-muted">
            {GROWTH_CAMPAIGN_OBJECTIVE_LABELS[draft.objective as GrowthCampaignObjective] ??
              "Custom"}{" "}
            · {saving ? "Saving…" : "Saved"}
          </p>
        </div>
        {locked ? (
          <ButtonLink href={`/account/growth/campaigns/${draft.id}/results`} variant="cta" size="sm">
            View results
          </ButtonLink>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Campaign steps">
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStep(item.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              step === item.id
                ? "bg-forest text-fix-primary-foreground"
                : "bg-fix-bg-muted text-fix-text-muted"
            }`}
          >
            {index + 1}. {item.label}
          </button>
        ))}
      </nav>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-fix-text">{message}</p> : null}
      {locked ? (
        <p className="text-sm text-fix-text-muted">This campaign already sent. Content is locked.</p>
      ) : null}

      {step === "campaign" ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <Field label="Campaign name">
            <input
              className={inputClass}
              value={draft.name}
              disabled={locked}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <Field label="Objective">
            <select
              className={inputClass}
              value={draft.objective ?? ""}
              disabled={locked}
              onChange={(e) => patch({ objective: e.target.value || null })}
            >
              {Object.entries(GROWTH_CAMPAIGN_OBJECTIVE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Internal notes">
            <textarea
              className={inputClass + " min-h-[80px]"}
              value={draft.description ?? ""}
              disabled={locked}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <Field label="Channel">
            <select className={inputClass} value="EMAIL" disabled>
              <option value="EMAIL">Email</option>
            </select>
          </Field>
        </Card>
      ) : null}

      {step === "audience" ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <p className="text-sm font-medium text-fix-heading">
            Estimated recipients: {estimated ?? "…"}
          </p>
          <Field label="Who should receive this?">
            <select
              className={inputClass}
              value={draft.audienceType}
              disabled={locked}
              onChange={(e) =>
                patch({
                  audienceType: e.target.value,
                  audienceJson: e.target.value === GROWTH_CAMPAIGN_AUDIENCE.STATUS
                    ? { status: audienceJson.status || "CUSTOMER" }
                    : e.target.value === GROWTH_CAMPAIGN_AUDIENCE.MANUAL
                      ? { contactIds: audienceJson.contactIds ?? [] }
                      : {},
                })
              }
            >
              <option value={GROWTH_CAMPAIGN_AUDIENCE.ALL}>All contacts</option>
              <option value={GROWTH_CAMPAIGN_AUDIENCE.STATUS}>Customer type</option>
              <option value={GROWTH_CAMPAIGN_AUDIENCE.MANUAL}>Manually select contacts</option>
            </select>
          </Field>
          {draft.audienceType === GROWTH_CAMPAIGN_AUDIENCE.STATUS ? (
            <Field label="Customer type">
              <select
                className={inputClass}
                value={audienceJson.status ?? "CUSTOMER"}
                disabled={locked}
                onChange={(e) => patch({ audienceJson: { status: e.target.value } })}
              >
                {Object.entries(GROWTH_CONTACT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {draft.audienceType === GROWTH_CAMPAIGN_AUDIENCE.MANUAL ? (
            <div className="space-y-2">
              <input
                className={inputClass}
                placeholder="Search contacts"
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
              />
              <ul className="max-h-64 space-y-1 overflow-auto text-sm">
                {filteredContacts.map((contact) => {
                  const checked = selectedIds.has(contact.id);
                  return (
                    <li key={contact.id}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (checked) next.delete(contact.id);
                            else next.add(contact.id);
                            patch({ audienceJson: { contactIds: [...next] } });
                          }}
                        />
                        <span>
                          {contact.name}{" "}
                          <span className="text-fix-text-muted">{contact.email}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-fix-text-muted">
            Unsubscribed contacts, missing emails, and contacts without marketing opt-in are removed automatically.
          </p>
        </Card>
      ) : null}

      {step === "destination" ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <p className="text-sm text-fix-text-muted">Where should people go when they click?</p>
          <Field label="Destination">
            <select
              className={inputClass}
              value={draft.destinationType ?? ""}
              disabled={locked}
              onChange={(e) =>
                patch({
                  destinationType: e.target.value || null,
                  destinationId: null,
                  destinationUrl: null,
                })
              }
            >
              <option value="">Choose…</option>
              <option value={GROWTH_CAMPAIGN_DESTINATION.FUNNEL}>Funnel</option>
              <option value={GROWTH_CAMPAIGN_DESTINATION.LISTING}>Listing</option>
              <option value={GROWTH_CAMPAIGN_DESTINATION.BOOKING}>Booking page</option>
              {destinations.events.length ? (
                <option value={GROWTH_CAMPAIGN_DESTINATION.EVENT}>Event</option>
              ) : null}
              <option value={GROWTH_CAMPAIGN_DESTINATION.EXTERNAL}>External URL</option>
            </select>
          </Field>
          {draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.FUNNEL &&
          destinations.funnels.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              bordered={false}
              title="You haven’t created a funnel yet."
              action={{ href: "/account/growth/funnels", label: "Create Funnel" }}
            />
          ) : null}
          {draft.destinationType && draft.destinationType !== GROWTH_CAMPAIGN_DESTINATION.EXTERNAL ? (
            <Field label="Select">
              <select
                className={inputClass}
                value={draft.destinationId ?? ""}
                disabled={locked}
                onChange={(e) => {
                  const option = destinationOptions.find((row) => row.id === e.target.value);
                  patch({
                    destinationId: e.target.value || null,
                    destinationUrl: option?.url ?? null,
                    ctaUrl: option?.url ?? draft.ctaUrl,
                  });
                }}
              >
                <option value="">Choose…</option>
                {destinationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.status ? ` · ${option.status}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {draft.destinationType === GROWTH_CAMPAIGN_DESTINATION.EXTERNAL ? (
            <Field label="URL">
              <input
                className={inputClass}
                value={draft.destinationUrl ?? ""}
                disabled={locked}
                placeholder="https://"
                onChange={(e) =>
                  patch({ destinationUrl: e.target.value, ctaUrl: e.target.value })
                }
              />
            </Field>
          ) : null}
          {selectedDestination ? (
            <p className="text-sm text-fix-text-muted">
              {selectedDestination.name}
              {selectedDestination.status ? ` · ${selectedDestination.status}` : ""} ·{" "}
              {selectedDestination.url}
            </p>
          ) : null}
        </Card>
      ) : null}

      {step === "message" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4 sm:p-5">
            <Field label="Sender name">
              <input
                className={inputClass}
                value={draft.senderName ?? vendor.displayName}
                disabled={locked}
                onChange={(e) => patch({ senderName: e.target.value })}
              />
            </Field>
            <Field label="Reply-to">
              <input
                className={inputClass}
                value={draft.replyTo ?? vendor.contactEmail ?? ""}
                disabled={locked}
                onChange={(e) => patch({ replyTo: e.target.value })}
              />
            </Field>
            <Field label="Subject">
              <input
                className={inputClass}
                value={draft.subject ?? ""}
                disabled={locked}
                onChange={(e) => patch({ subject: e.target.value })}
              />
            </Field>
            <Field label="Preview text">
              <input
                className={inputClass}
                value={draft.previewText ?? ""}
                disabled={locked}
                onChange={(e) => patch({ previewText: e.target.value })}
              />
            </Field>
            <Field label="Headline">
              <input
                className={inputClass}
                value={draft.headline ?? ""}
                disabled={locked}
                onChange={(e) => patch({ headline: e.target.value })}
              />
            </Field>
            <Field label="Hero image">
              {draft.heroImageUrl ? (
                <div className="mt-1 space-y-2">
                  <img
                    src={draft.heroImageUrl}
                    alt="Hero"
                    className="max-h-48 w-full rounded-lg border border-fix-border/20 object-cover"
                  />
                  {!locked && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <ImagePlus className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ heroImageUrl: null })}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-1"
                  disabled={locked || imageUploading}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imageUploading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden />
                      Add hero image
                    </>
                  )}
                </Button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setCropSrc(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            {cropSrc && (
              <ImageCropModal
                imageSrc={cropSrc}
                initialAspect={16 / 9}
                onCancel={() => setCropSrc(null)}
                onCrop={async (blob) => {
                  setCropSrc(null);
                  setImageUploading(true);
                  try {
                    const fd = new FormData();
                    fd.set("file", blob, "hero.jpg");
                    const res = await fetch("/api/growth/campaigns/upload", {
                      method: "POST",
                      body: fd,
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setError(data.error ?? "Upload failed");
                      return;
                    }
                    patch({ heroImageUrl: data.url });
                  } catch {
                    setError("Image upload failed.");
                  } finally {
                    setImageUploading(false);
                  }
                }}
              />
            )}
            <Field label="Email body">
              <textarea
                className={inputClass + " min-h-[140px]"}
                value={draft.bodyHtml ?? ""}
                disabled={locked}
                onChange={(e) => patch({ bodyHtml: e.target.value })}
              />
            </Field>
            <Field label="CTA button text">
              <input
                className={inputClass}
                value={draft.ctaLabel ?? ""}
                disabled={locked}
                onChange={(e) => patch({ ctaLabel: e.target.value })}
              />
            </Field>
            <Field label="CTA URL">
              <input
                className={inputClass}
                value={draft.ctaUrl ?? draft.destinationUrl ?? ""}
                disabled={locked}
                onChange={(e) => patch({ ctaUrl: e.target.value })}
              />
            </Field>
            <div className="rounded-xl bg-fix-bg-muted/60 p-3">
              <p className="text-sm font-semibold text-fix-heading">Write with Rootie</p>
              <Field label="What should Rootie emphasize?">
                <input
                  className={inputClass}
                  value={emphasize}
                  onChange={(e) => setEmphasize(e.target.value)}
                />
              </Field>
              <Field label="Tone">
                <select className={inputClass} value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                disabled={pending || locked}
                onClick={() => {
                  startTransition(async () => {
                    const res = await fetch(`/api/growth/campaigns/${draft.id}/copy`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ emphasize, tone }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setError(data.error ?? "Rootie could not write copy");
                      return;
                    }
                    patch({
                      subject: data.draft.subject,
                      previewText: data.draft.previewText,
                      headline: data.draft.headline,
                      bodyHtml: data.draft.bodyHtml,
                      ctaLabel: data.draft.ctaLabel,
                    });
                    setMessage("Rootie drafted copy. Edit anything you like.");
                  });
                }}
              >
                Write with Rootie
              </Button>
            </div>
          </Card>
          <Card className="space-y-3 p-4 sm:p-5">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={previewMobile ? "ghost" : "secondary"}
                onClick={() => setPreviewMobile(false)}
              >
                Desktop
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMobile ? "secondary" : "ghost"}
                onClick={() => setPreviewMobile(true)}
              >
                Mobile
              </Button>
            </div>
            {mounted && previewHtml ? (
              <iframe
                title="Email preview"
                className={`min-h-[420px] rounded-xl border border-fix-border/20 bg-white ${
                  previewMobile ? "mx-auto w-[320px]" : "w-full"
                }`}
                srcDoc={previewHtml}
              />
            ) : (
              <p className="text-sm text-fix-text-muted">Loading preview…</p>
            )}
          </Card>
        </div>
      ) : null}

      {step === "schedule" ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scheduleMode === "now"}
              disabled={locked}
              onChange={() => setScheduleMode("now")}
            />
            Send now
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scheduleMode === "schedule"}
              disabled={locked}
              onChange={() => setScheduleMode("schedule")}
            />
            Schedule
          </label>
          {scheduleMode === "schedule" ? (
            <Field label="Date and time">
              <input
                type="datetime-local"
                className={inputClass}
                value={scheduleLocal}
                disabled={locked}
                onChange={(e) => setScheduleLocal(e.target.value)}
              />
            </Field>
          ) : null}
          <p className="text-xs text-fix-text-muted">
            Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Nothing sends until you
            confirm on Review.
          </p>
          <FollowUpEditor draft={draft} locked={locked} onChange={patch} />
        </Card>
      ) : null}

      {step === "review" ? (
        <Card className="space-y-3 p-4 sm:p-5">
          <ReviewLine label="Campaign" value={draft.name} />
          <ReviewLine
            label="Objective"
            value={
              GROWTH_CAMPAIGN_OBJECTIVE_LABELS[draft.objective as GrowthCampaignObjective] ?? "—"
            }
          />
          <ReviewLine label="Channel" value="Email" />
          <ReviewLine
            label="Audience"
            value={`${draft.audienceType}${estimated != null ? ` · ${estimated} recipients` : ""}`}
          />
          <ReviewLine
            label="Destination"
            value={selectedDestination?.name || draft.destinationUrl || "Not set"}
          />
          <ReviewLine label="Subject" value={draft.subject || "—"} />
          <ReviewLine label="CTA" value={draft.ctaLabel || "—"} />
          <ReviewLine
            label="Schedule"
            value={scheduleMode === "schedule" && scheduleLocal ? scheduleLocal : "Send now"}
          />
          {mounted && previewHtml ? (
            <iframe
              title="Review preview"
              className="min-h-[280px] w-full rounded-xl border border-fix-border/20"
              srcDoc={previewHtml}
            />
          ) : null}
          <Field label="Send test email">
            <div className="flex flex-wrap gap-2">
              <input
                className={inputClass + " mt-0 flex-1"}
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await fetch(`/api/growth/campaigns/${draft.id}/test`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ toEmail: testEmail }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) setError(data.error ?? "Test failed");
                    else setMessage(`Test sent to ${data.toEmail}.`);
                  });
                }}
              >
                Send test
              </Button>
            </div>
          </Field>
          {!locked ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmSend}
                  onChange={(e) => setConfirmSend(e.target.checked)}
                />
                I confirm this campaign should send to eligible CRM contacts.
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="cta"
                  size="sm"
                  disabled={pending || !confirmSend}
                  onClick={() => {
                    if (scheduleMode === "schedule") {
                      if (!scheduleLocal) {
                        setError("Choose a date and time.");
                        return;
                      }
                      runAction(
                        {
                          action: "schedule",
                          scheduledAt: new Date(scheduleLocal).toISOString(),
                          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        },
                        () => {
                          setMessage("Campaign scheduled.");
                          router.push("/account/growth/campaigns");
                        },
                      );
                    } else {
                      runAction({ action: "send" }, () => {
                        setMessage("Campaign sent.");
                        router.push(`/account/growth/campaigns/${draft.id}/results`);
                      });
                    }
                  }}
                >
                  {scheduleMode === "schedule" ? "Schedule campaign" : "Send campaign"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => router.push("/account/growth/campaigns")}
                >
                  Save draft
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={stepIndex <= 0}
          onClick={() => setStep(STEPS[stepIndex - 1]!.id)}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={stepIndex >= STEPS.length - 1}
          onClick={() => setStep(STEPS[stepIndex + 1]!.id)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-fix-text-muted">{label}</label>
      {children}
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-fix-text-muted">{label}: </span>
      <span className="text-fix-heading">{value}</span>
    </p>
  );
}

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FollowUpEditor({
  draft,
  locked,
  onChange,
}: {
  draft: CampaignBuilderCampaign;
  locked: boolean;
  onChange: (partial: Partial<CampaignBuilderCampaign>) => void;
}) {
  const noClick =
    draft.steps.find((step) => step.triggerType === GROWTH_CAMPAIGN_STEP_TRIGGER.NO_CLICK) ?? {
      triggerType: GROWTH_CAMPAIGN_STEP_TRIGGER.NO_CLICK,
      delayHours: 48,
      subject: "",
      previewText: "",
      bodyHtml: "",
      ctaLabel: "",
      isEnabled: false,
      id: "new-no-click",
    };
  const clicked =
    draft.steps.find((step) => step.triggerType === GROWTH_CAMPAIGN_STEP_TRIGGER.CLICKED_NO_CONVERT) ?? {
      triggerType: GROWTH_CAMPAIGN_STEP_TRIGGER.CLICKED_NO_CONVERT,
      delayHours: 48,
      subject: "",
      previewText: "",
      bodyHtml: "",
      ctaLabel: "",
      isEnabled: false,
      id: "new-clicked",
    };

  function update(
    trigger: string,
    partial: Partial<CampaignBuilderCampaign["steps"][number]>,
  ) {
    const next = [noClick, clicked].map((step) =>
      step.triggerType === trigger ? { ...step, ...partial } : step,
    );
    onChange({ steps: next });
  }

  return (
    <div className="space-y-3 rounded-xl border border-fix-border/15 p-3">
      <p className="text-sm font-semibold text-fix-heading">Follow-up (stored, not auto-sent yet)</p>
      <p className="text-xs text-fix-text-muted">
        Follow-ups stop after conversion. Sending these automatically ships after the core campaign
        flow is stable.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={locked}
          checked={noClick.isEnabled}
          onChange={(e) => update(noClick.triggerType, { isEnabled: e.target.checked })}
        />
        Follow up with people who did not click
      </label>
      {noClick.isEnabled ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Send after (days)">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={Math.round(noClick.delayHours / 24)}
              disabled={locked}
              onChange={(e) =>
                update(noClick.triggerType, { delayHours: Number(e.target.value || 2) * 24 })
              }
            />
          </Field>
          <Field label="Subject">
            <input
              className={inputClass}
              value={noClick.subject ?? ""}
              disabled={locked}
              onChange={(e) => update(noClick.triggerType, { subject: e.target.value })}
            />
          </Field>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={locked}
          checked={clicked.isEnabled}
          onChange={(e) => update(clicked.triggerType, { isEnabled: e.target.checked })}
        />
        Follow up with people who clicked but did not convert
      </label>
      {clicked.isEnabled ? (
        <Field label="Follow-up body">
          <textarea
            className={inputClass + " min-h-[72px]"}
            value={clicked.bodyHtml ?? ""}
            disabled={locked}
            onChange={(e) => update(clicked.triggerType, { bodyHtml: e.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}
